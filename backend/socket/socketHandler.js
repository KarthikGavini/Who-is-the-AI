// socket/socketHandler.js
import Room from '../models/Room.js';
import { gameContent } from '../gameContent.js';


// --- NEW: Reusable function to tally votes and end the game ---
const tallyVotesAndEndGame = async (roomId, io) => {
    try {

        const room = await Room.findOne({ roomId });
        if (!room || room.gameState !== 'voting') return;

        const voteCounts = room.votes.reduce((acc, vote) => {
            acc[vote.votedForSocketId] = (acc[vote.votedForSocketId] || 0) + 1;
            return acc;
        }, {});

        let votedOutSocketId = null;
        if (room.votes.length > 0) {
            votedOutSocketId = Object.keys(voteCounts).reduce((a, b) => voteCounts[a] > voteCounts[b] ? a : b);
        }

        const aiPlayer = room.players.find(p => p.socketId === room.aiPlayerSocketId);
        const votedOutPlayer = room.players.find(p => p.socketId === votedOutSocketId);
        const playersWin = votedOutSocketId === room.aiPlayerSocketId;

        // Store results directly in the room document
        room.results = { aiPlayer, votedOutPlayer, playersWin, voteCounts };
        room.gameState = 'finished';
        await room.save();

        // Broadcast the final state with results included
        io.to(roomId).emit('roomUpdate', room);
        console.log(`Game finished in room ${roomId}. Players win: ${playersWin}`);

    } catch (err) {
        console.error(`Error tallying votes for room ${roomId}:`, err);
    }
};

const registerSocketHandlers = (io, chloe_model) => {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on('joinRoom', async ({ roomId, nickname }) => {
            try {
                socket.join(roomId);
                // Store roomId on the socket object to use it in the 'disconnect' event
                socket.data.roomId = roomId;

                const room = await Room.findOne({ roomId });
                if (!room) {
                    return socket.emit('error', 'Room not found');
                }

                // If a player tries to join a full room, reject them.
                if (room.players.length >= room.maxPlayers) {
                    console.log(`User ${socket.id} blocked from joining full room ${roomId}.`);
                    // We should ideally have a dedicated 'joinError' event for the client.
                    return socket.emit('error', 'This room is full.');
                }

                const initialPlayerCount = room.players.length;

                // Atomically find a room that does NOT contain the player and push them.
                const updatedRoom = await Room.findOneAndUpdate(
                    { roomId: roomId, 'players.socketId': { $ne: socket.id } }, // Condition
                    { $push: { players: { socketId: socket.id, nickname } } },    // Action
                    { new: true } // Return the updated document
                );

                if (updatedRoom) {
                    // This block runs ONLY if the player was successfully added.
                    console.log(`User ${socket.id} with nickname ${nickname} joined room ${roomId}`);
                    let finalRoom = updatedRoom;
                    // If the room was empty before, this new player is the host.
                    if (initialPlayerCount === 0) {
                        finalRoom.hostId = socket.id;
                        await finalRoom.save();
                    }
                    io.to(roomId).emit('roomUpdate', finalRoom);
                } else {
                    // This block runs if the update failed, meaning the player was already there.
                    console.log(`Player ${socket.id} reconnected to room ${roomId}.`);
                    const currentRoom = await Room.findOne({ roomId });
                    socket.emit('roomUpdate', currentRoom);
                }
            } catch (err) {
                console.error(err);
                socket.emit('error', 'Server error');
            }
        });

        socket.on('updateGameSettings', async ({ roomId, maxPlayers, gameDuration }) => {

            try {
                const room = await Room.findOne({ roomId });

                // 1. Security Check: Only the host can change game settings.
                if (!room || socket.id !== room.hostId) {
                    console.log(`Non-host user ${socket.id} tried to change settings.`);
                    return; // Silently ignore the request if the user is not the host.
                }

                // 2. Data Validation: Update settings if they are valid.
                if (maxPlayers && (maxPlayers >= 3 && maxPlayers <= 5)) {
                    room.maxPlayers = maxPlayers;
                }

                // A list of allowed durations in seconds
                const allowedDurations = [10, 60, 120, 180, 240, 300];
                if (gameDuration && allowedDurations.includes(gameDuration)) {
                    room.gameDuration = gameDuration;
                }

                await room.save();

                // 3. Broadcast Update: Inform all players in the room of the new settings.
                io.to(roomId).emit('roomUpdate', room);
                console.log(`Host ${socket.id} updated settings for room ${roomId}`);

            } catch (err) {
                console.error(`Error updating settings for room ${roomId}:`, err);
            }
        });

        socket.on('startGame', async ({ roomId }) => {
            try {
                const room = await Room.findOne({ roomId });
                if (!room || socket.id !== room.hostId) return;

                // ... (game setup logic remains the same)
                room.gameState = 'playing';
                room.players.forEach(p => p.voted = false); // Reset votes
                const playerCount = room.players.length;
                const aiIndex = Math.floor(Math.random() * playerCount);
                room.aiPlayerSocketId = room.players[aiIndex].socketId;
                const themeIndex = Math.floor(Math.random() * gameContent.length);
                const selectedTheme = gameContent[themeIndex];
                room.currentTheme = selectedTheme.theme;
                room.currentQuestion = selectedTheme.questions[0];
                await room.save();

                io.to(roomId).emit('gameStarted', room);
                console.log(`Game started in room ${roomId}.`);

                // Chat phase timer
                setTimeout(async () => {
                    try {
                        const roomToEnd = await Room.findOne({ roomId });
                        if (roomToEnd && roomToEnd.gameState === 'playing') {
                            roomToEnd.gameState = 'voting';
                            await roomToEnd.save();
                            // io.to(roomId).emit('startVoting');
                            io.to(roomId).emit('roomUpdate', roomToEnd);
                            console.log(`Voting has started in room ${roomId}.`);

                            // --- NEW: Start a 30-second voting timer ---
                            setTimeout(() => {
                                tallyVotesAndEndGame(roomId, io);
                            }, 30 * 1000); // 30 seconds
                        }
                    } catch (err) {
                        console.error(`Error ending game in room ${roomId}:`, err);
                    }
                }, room.gameDuration * 1000);

            } catch (err) {
                console.error(err);
                socket.emit('error', 'Failed to start game');
            }
        });


        socket.on('sendMessage', async ({ roomId, messageText }) => {
            try {
                const room = await Room.findOne({ roomId });
                if (!room) return;

                const sender = room.players.find(p => p.socketId === socket.id);
                if (!sender) return;

                const humanMessage = { nickname: sender.nickname, text: messageText, socketId: socket.id };
                room.messages.push(humanMessage);
                io.to(roomId).emit('newMessage', humanMessage);

                if (room.aiPlayerSocketId && socket.id !== room.aiPlayerSocketId) {
                    const aiPlayer = room.players.find(p => p.socketId === room.aiPlayerSocketId);
                    if (!aiPlayer) return;

                    const historyForAI = room.messages.map(msg => ({
                        role: msg.socketId === room.aiPlayerSocketId ? "model" : "user",
                        parts: [{ text: `${msg.nickname}: ${msg.text}` }]
                    }));

                    const chat = chloe_model.startChat({ history: historyForAI });
                    const result = await chat.sendMessage("Your turn to respond.");
                    const aiResponseText = result.response.text();

                    const aiMessage = { nickname: aiPlayer.nickname, text: aiResponseText, socketId: room.aiPlayerSocketId };
                    room.messages.push(aiMessage);

                    setTimeout(() => {
                        io.to(roomId).emit('newMessage', aiMessage);
                    }, 1500);
                }

                await room.save();
            } catch (err) {
                console.error("Chat Error:", err);
            }
        });


        socket.on('castVote', async ({ roomId, votedForSocketId }) => {
            try {
                const room = await Room.findOne({ roomId });
                if (!room || room.gameState !== 'voting') return;

                // ... (your existing logic to add the vote) ...
                room.votes.push({ voterSocketId: socket.id, votedForSocketId });
                await room.save(); // Save after pushing the vote

                // --- ADD THIS LOG FOR DEBUGGING ---
                console.log(`Vote cast in ${roomId}. Total votes: ${room.votes.length}, Players in room: ${room.players.length}`);

                if (room.votes.length === room.players.length) {
                    console.log("All players have voted. Ending game now."); // <-- Add this too!
                    tallyVotesAndEndGame(roomId, io);
                }
            } catch (err) {
                console.error(`Error casting vote in room ${roomId}:`, err);
            }
        });
        // --- END OF NEW LOGIC ---

        // --- REVISED "PLAY AGAIN" LOGIC ---
        socket.on('playAgain', async ({ roomId }) => {
            try {
                const room = await Room.findOne({ roomId });
                if (!room) return;

                // Mark the current player as ready
                const player = room.players.find(p => p.socketId === socket.id);
                if (player) {
                    player.ready = true;
                }

                // Check if all players are ready
                const allReady = room.players.every(p => p.ready);

                if (allReady) {
                    // --- If everyone is ready, reset the game ---
                    room.gameState = 'lobby';
                    room.messages = [];
                    room.votes = [];
                    room.aiPlayerSocketId = null;
                    room.currentTheme = '';
                    room.currentQuestion = '';
                    // Reset ready status for the new round
                    room.players.forEach(p => p.ready = false);
                    console.log(`Room ${roomId} is playing again.`);
                }

                await room.save();
                // Notify all players of the updated ready status (or the reset)
                io.to(roomId).emit('roomUpdate', room);

            } catch (err) {
                console.error(`Error in playAgain for room ${roomId}:`, err);
            }
        });

        // --- NEW "DISCONNECT" LOGIC ---
        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${socket.id}`);
            // This line now works because we set socket.data.roomId when the user joined.
            const roomId = socket.data.roomId;
            if (!roomId) return;

            // ... (rest of your disconnect logic is fine) ...
            try {
                const room = await Room.findOne({ roomId });
                if (!room) return;

                const disconnectedPlayerIndex = room.players.findIndex(p => p.socketId === socket.id);
                if (disconnectedPlayerIndex === -1) return;

                const wasHost = room.hostId === socket.id;
                room.players.splice(disconnectedPlayerIndex, 1);

                if (wasHost && room.players.length > 0) {
                    room.hostId = room.players[0].socketId;
                    console.log(`Host disconnected. New host in room ${roomId} is ${room.players[0].nickname}`);
                }

                if (room.players.length === 0) {
                    await Room.deleteOne({ roomId });
                    console.log(`Room ${roomId} is empty and has been deleted.`);
                } else {
                    await room.save();
                    io.to(roomId).emit('roomUpdate', room);
                }

            } catch (err) {
                console.error(`Error handling disconnect for room ${roomId}:`, err);
            }
        });
    });
};

export default registerSocketHandlers;