// socket/socketHandler.js
import Room from '../models/Room.js';
import { gameContent } from '../gameContent.js';


// --- NEW: Reusable function to tally votes and end the game ---
const tallyVotesAndEndGame = async (roomId, io) => {
    try {
        const room = await Room.findOne({ roomId });
        // Safety Check: Only run if the game is currently in the 'voting' state.
        if (!room || room.gameState !== 'voting') {
            return;
        }

        // Tally the results
        const voteCounts = room.votes.reduce((acc, vote) => {
            acc[vote.votedForSocketId] = (acc[vote.votedForSocketId] || 0) + 1;
            return acc;
        }, {});

        // Find the player with the most votes (handles ties by picking the first one)
        let votedOutSocketId = null;
        if (room.votes.length > 0) {
            votedOutSocketId = Object.keys(voteCounts).reduce((a, b) => voteCounts[a] > voteCounts[b] ? a : b);
        }

        const aiPlayer = room.players.find(p => p.socketId === room.aiPlayerSocketId);
        const votedOutPlayer = room.players.find(p => p.socketId === votedOutSocketId);

        // Determine the winner
        const playersWin = votedOutSocketId === room.aiPlayerSocketId;
        room.gameState = 'finished';
        await room.save();

        // Broadcast the results
        const results = {
            aiPlayer,
            votedOutPlayer,
            playersWin,
            voteCounts,
        };
        io.to(roomId).emit('gameFinished', results);
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
                console.log(`User ${socket.id} with nickname ${nickname} joined room ${roomId}`);

                socket.data.roomId = roomId;
                const room = await Room.findOne({ roomId });

                if (room) {
                    if (room.players.length === 0) {
                        room.hostId = socket.id;
                    }
                    room.players.push({ socketId: socket.id, nickname });
                    await room.save();
                    io.to(roomId).emit('roomUpdate', room);
                } else {
                    socket.emit('error', 'Room not found');
                }
            } catch (err) {
                console.error(err);
                socket.emit('error', 'Server error');
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
                            io.to(roomId).emit('startVoting');
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

        // --- NEW VOTE CASTING LOGIC ---
        // socket/socketHandler.js

        socket.on('castVote', async ({ roomId, votedForSocketId }) => {
            try {
                const room = await Room.findOne({ roomId });
                if (!room || room.gameState !== 'voting') return;

                const hasVoted = room.votes.some(vote => vote.voterSocketId === socket.id);
                if (hasVoted) return;

                // Atomically update the room by pushing the new vote
                const updatedRoom = await Room.findOneAndUpdate(
                    { roomId },
                    { $push: { votes: { voterSocketId: socket.id, votedForSocketId } } },
                    { new: true } // This option returns the document AFTER the update
                );

                // Now, check the length on the guaranteed updated document
                if (updatedRoom.votes.length === updatedRoom.players.length) {
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
            const roomId = socket.data.roomId;
            if (!roomId) return;

            try {
                const room = await Room.findOne({ roomId });
                if (!room) return;

                // Find and remove the disconnected player
                const disconnectedPlayerIndex = room.players.findIndex(p => p.socketId === socket.id);
                if (disconnectedPlayerIndex === -1) return;

                const wasHost = room.hostId === socket.id;
                room.players.splice(disconnectedPlayerIndex, 1);

                // If the host disconnected and players remain, assign a new host
                if (wasHost && room.players.length > 0) {
                    room.hostId = room.players[0].socketId; // The next player becomes host
                    console.log(`Host disconnected. New host in room ${roomId} is ${room.players[0].nickname}`);
                }

                // If the room is empty, you might want to delete it (optional)
                if (room.players.length === 0) {
                    await Room.deleteOne({ roomId });
                    console.log(`Room ${roomId} is empty and has been deleted.`);
                } else {
                    await room.save();
                    // Notify remaining players of the change
                    io.to(roomId).emit('roomUpdate', room);
                }

            } catch (err) {
                console.error(`Error handling disconnect for room ${roomId}:`, err);
            }
        });
    });
};

export default registerSocketHandlers;