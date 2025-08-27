// socket/socketHandler.js
import Room from '../models/Room.js';
import { gameContent } from '../gameContent.js';

const newLobbyMap = new Map();

const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

// --- NEW: Reusable function to tally votes and end the game ---
const tallyVotesAndEndGame = async (roomId, io) => {
    try {
        const room = await Room.findOne({ roomId });
        if (!room || room.gameState !== 'voting') {
            return;
        }

        // Tally votes based on socket IDs
        const voteCounts = room.votes.reduce((acc, vote) => {
            acc[vote.votedForSocketId] = (acc[vote.votedForSocketId] || 0) + 1;
            return acc;
        }, {});

        let votedOutSocketId = null;
        if (room.votes.length > 0) {
            votedOutSocketId = Object.keys(voteCounts).reduce((a, b) => voteCounts[a] > voteCounts[b] ? a : b);
        }

        const playersWin = votedOutSocketId === room.aiPlayerSocketId;

        // --- NEW: Prepare results using anonymous names for the frontend ---
        const anonymousPlayersMap = new Map(room.anonymousPlayers);
        const aiPlayerName = anonymousPlayersMap.get(room.aiPlayerSocketId) || 'Unknown AI';
        const votedOutName = anonymousPlayersMap.get(votedOutSocketId) || 'No one';

        // Create a breakdown of who voted for whom using anonymous names
        const voteBreakdown = {};
        for (const vote of room.votes) {
            const voterName = anonymousPlayersMap.get(vote.voterSocketId);
            const votedForName = anonymousPlayersMap.get(vote.votedForSocketId);
            if (voterName && votedForName) {
                if (!voteBreakdown[votedForName]) {
                    voteBreakdown[votedForName] = [];
                }
                voteBreakdown[votedForName].push(voterName);
            }
        }

        room.results = {
            aiPlayerName,
            votedOutName,
            playersWin,
            voteBreakdown, // e.g., { "Player 2": ["Player 1", "Player 3"] }
        };
        // --- END OF NEW LOGIC ---

        room.gameState = 'finished';
        await room.save();

        io.to(roomId).emit('gameFinished', room.results);
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
                const room = await Room.findOne({ roomId });
                if (!room) {
                    return socket.emit('error', 'Room not found');
                }

                if (room.gameState !== 'lobby') {
                    return socket.emit('error', 'This game has already started.');
                }

                if (room.players.length >= room.maxPlayers) {
                    return socket.emit('error', 'This room is full.');
                }

                // --- MOVED ---
                // Only join the socket to the room AFTER all checks have passed.
                socket.join(roomId);
                socket.data.roomId = roomId;

                const initialPlayerCount = room.players.length;
                const updatedRoom = await Room.findOneAndUpdate(
                    { roomId: roomId, 'players.socketId': { $ne: socket.id } },
                    { $push: { players: { socketId: socket.id, nickname } } },
                    { new: true }
                );

                if (updatedRoom) {
                    console.log(`User ${socket.id} with nickname ${nickname} joined room ${roomId}`);
                    let finalRoom = updatedRoom;
                    if (initialPlayerCount === 0) {
                        finalRoom.hostId = socket.id;
                        await finalRoom.save();
                    }
                    io.to(roomId).emit('roomUpdate', finalRoom);
                } else {
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

                // --- NEW LOGIC ---

                // 1. Create a list of all participants, including a virtual AI player
                const humanPlayers = room.players.map(p => ({ socketId: p.socketId, nickname: p.nickname }));
                const aiPlayer = { socketId: 'AI_PLAYER_ID', nickname: 'Chloe' }; // The AI is now its own entity
                const allParticipants = [...humanPlayers, aiPlayer];

                // 2. Shuffle the list to randomize who is "Player 1", "Player 2", etc.
                const shuffledParticipants = shuffleArray(allParticipants);

                // 3. Create a map of real IDs to anonymous names and save it
                const anonymousPlayersMap = new Map();
                shuffledParticipants.forEach((player, index) => {
                    anonymousPlayersMap.set(player.socketId, `Player ${index + 1}`);
                });
                room.anonymousPlayers = anonymousPlayersMap;

                // --- END OF NEW LOGIC ---

                // Reset the room for a new game
                room.gameState = 'playing';
                room.messages = [];
                room.votes = [];
                room.aiPlayerSocketId = 'AI_PLAYER_ID'; // Store the AI's constant ID

                // Set the theme and question
                const themeIndex = Math.floor(Math.random() * gameContent.length);
                const selectedTheme = gameContent[themeIndex];
                room.currentTheme = selectedTheme.theme;
                room.currentQuestion = selectedTheme.questions[0];

                await room.save();

                io.to(roomId).emit('gameStarted', room);
                console.log(`Game started in room ${roomId} with ${allParticipants.length} anonymous participants.`);

                // The game timer logic remains the same
                setTimeout(async () => {
                    try {
                        const roomToEnd = await Room.findOne({ roomId });
                        if (roomToEnd && roomToEnd.gameState === 'playing') {
                            roomToEnd.gameState = 'voting';
                            await roomToEnd.save();
                            io.to(roomId).emit('roomUpdate', roomToEnd);
                            console.log(`Voting has started in room ${roomId}.`);

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
                if (!room || room.gameState !== 'playing') return;

                // --- NEW AI LOGIC ---

                // 1. Identify the human sender's anonymous name.
                const senderAnonymousName = room.anonymousPlayers.get(socket.id);
                if (!senderAnonymousName) return; // Safety check

                // 2. Save and broadcast the human's message.
                const humanMessage = {
                    nickname: senderAnonymousName, // NOTE: We now use the 'nickname' field for anonymous names
                    text: messageText,
                    socketId: socket.id,
                };
                room.messages.push(humanMessage);
                io.to(roomId).emit('newMessage', humanMessage);

                // 3. Prepare and trigger the AI's response.
                // Build the chat history for the AI using anonymous names for context.
                const historyForAI = room.messages.map(msg => {
                    const authorName = room.anonymousPlayers.get(msg.socketId) || 'Unknown Player';
                    return {
                        role: msg.socketId === 'AI_PLAYER_ID' ? "model" : "user",
                        parts: [{ text: `${authorName}: ${msg.text}` }],
                    };
                });

                // Give the AI its context and prompt it to respond.
                const aiPrompt = `You are playing a social deduction game. Your anonymous name is ${room.anonymousPlayers.get('AI_PLAYER_ID')}. The game's theme is "${room.currentTheme}" and the current question is "${room.currentQuestion}". It is your turn to respond in the chat. Keep your response brief and natural, like a text message.`;

                const chat = chloe_model.startChat({ history: historyForAI });
                const result = await chat.sendMessage(aiPrompt);
                const aiResponseText = result.response.text();

                const aiAnonymousName = room.anonymousPlayers.get('AI_PLAYER_ID');
                const aiMessage = {
                    nickname: aiAnonymousName,
                    text: aiResponseText,
                    socketId: 'AI_PLAYER_ID',
                };
                room.messages.push(aiMessage);

                // 4. Broadcast the AI's message after a short, natural delay.
                setTimeout(() => {
                    io.to(roomId).emit('newMessage', aiMessage);
                }, 1500); // 1.5-second delay

                await room.save();

            } catch (err) {
                console.error("Chat Error:", err);
            }
        });


        socket.on('castVote', async ({ roomId, votedForSocketId }) => {
            try {
                const room = await Room.findOne({ roomId });
                if (!room || room.gameState !== 'voting') return;

                // Check if player has already voted
                const hasVoted = room.votes.some(vote => vote.voterSocketId === socket.id);
                if (hasVoted) return;

                room.votes.push({ voterSocketId: socket.id, votedForSocketId });
                await room.save();

                console.log(`Vote cast in ${roomId}. Total votes: ${room.votes.length}, Human players: ${room.players.length}`);

                // End the game when the number of votes equals the number of human players (since the AI doesn't vote)
                if (room.votes.length === room.players.length) {
                    console.log("All human players have voted. Ending game now.");
                    tallyVotesAndEndGame(roomId, io);
                }
            } catch (err) {
                console.error(`Error casting vote in ${roomId}:`, err);
            }
        });

        socket.on('findOrCreateLobby', async ({ oldRoomId }) => {
            console.log(`[Backend] Received 'findOrCreateLobby' for old room: ${oldRoomId}`);
            try {
                let newRoomId;

                if (newLobbyMap.has(oldRoomId)) {
                    newRoomId = newLobbyMap.get(oldRoomId);
                    console.log(`[Backend] Found existing new lobby. ID: ${newRoomId}`);
                } else {
                    newRoomId = Math.random().toString(36).substring(2, 6).toUpperCase();
                    console.log(`[Backend] Creating new lobby with ID: ${newRoomId}`);
                    const newRoom = new Room({
                        roomId: newRoomId,
                        players: [],
                        hostId: socket.id // --- THE FIX IS HERE --- The player who creates the lobby is the new host.
                    });
                    await newRoom.save(); // This will now succeed!
                    newLobbyMap.set(oldRoomId, newRoomId);
                    console.log(`[Backend] New lobby ${newRoomId} saved to DB and mapped.`);
                }

                console.log(`[Backend] Emitting 'navigateToNewLobby' back to client with ID: ${newRoomId}`);
                socket.emit('navigateToNewLobby', newRoomId);

            } catch (err) {
                console.error(`[Backend] CRITICAL ERROR in findOrCreateLobby:`, err);
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