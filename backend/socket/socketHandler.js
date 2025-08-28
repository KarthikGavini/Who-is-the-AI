// socket/socketHandler.js
import Room from '../models/Room.js';
import { gameContent } from '../gameContent.js';
import { v4 as uuidv4 } from 'uuid';

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

        // Tally all votes (including the AI's)
        const voteCounts = room.votes.reduce((acc, vote) => {
            acc[vote.votedForSocketId] = (acc[vote.votedForSocketId] || 0) + 1;
            return acc;
        }, {});

        let votedOutSocketId = null;
        let maxVotes = 0;
        if (room.votes.length > 0) {
            votedOutSocketId = Object.keys(voteCounts).reduce((a, b) => voteCounts[a] > voteCounts[b] ? a : b);
            maxVotes = voteCounts[votedOutSocketId];
        }

        // --- NEW: Stricter Win Condition Logic ---
        const humanVoterCount = room.players.length;
        // Humans win ONLY if they vote out the AI with more than half of the human votes.
        const playersWin = (votedOutSocketId === room.aiPlayerSocketId) && (maxVotes > humanVoterCount / 2);
        // --- END OF NEW LOGIC ---

        const anonymousPlayersMap = new Map(room.anonymousPlayers);
        const aiPlayerName = anonymousPlayersMap.get(room.aiPlayerSocketId) || 'Unknown AI';
        const votedOutName = anonymousPlayersMap.get(votedOutSocketId) || 'No one';

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
            voteBreakdown,
        };

        room.gameState = 'finished';
        await room.save();

        io.to(roomId).emit('gameFinished', room.results);
        console.log(`Game finished in room ${roomId}. Players win: ${playersWin}`);

    } catch (err) {
        console.error(`Error tallying votes for room ${roomId}:`, err);
    }
};

const handlePlayerLeave = async (socket, roomId, io) => {
    if (!roomId) return;
    try {
        const room = await Room.findOne({ roomId });
        if (!room) return;

        const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex === -1) return;

        const removedPlayer = room.players.splice(playerIndex, 1)[0];
        const wasHost = room.hostId === socket.id;
        console.log(`Player ${removedPlayer.nickname} left room ${roomId}.`);

        if (room.players.length === 0) {
            await Room.deleteOne({ roomId });
            console.log(`Room ${roomId} is empty and has been deleted.`);
        } else {
            if (wasHost && room.players.length > 0) {
                room.hostId = room.players[0].socketId;
            }
            const updatedRoom = await room.save();
            io.to(roomId).emit('roomUpdate', updatedRoom);
        }
        
        // --- THE FIX IS HERE: Add this line back ---
        socket.leave(roomId);
        
    } catch (err) {
        console.error(`Error during player leave for room ${roomId}:`, err);
    }
};

const registerSocketHandlers = (io, chloe_model) => {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        socket.on('joinRoom', async ({ roomId, nickname }) => {
            try {
                // This single, atomic operation tries to add a new player ONLY if all conditions are met.
                const updatedRoom = await Room.findOneAndUpdate(
                    {
                        roomId: roomId,
                        gameState: 'lobby', // Condition: Must be in lobby
                        'players.socketId': { $ne: socket.id }, // Condition: Player's socket.id not already in the room
                        $expr: { $lt: [{ $size: '$players' }, '$maxPlayers'] } // Condition: Room is not full
                    },
                    { $push: { players: { socketId: socket.id, nickname } } }, // Action: Add the player
                    { new: true }
                );

                if (updatedRoom) {
                    // This block runs if the player was successfully added.
                    socket.join(roomId);
                    socket.data.roomId = roomId;

                    let finalRoom = updatedRoom;
                    // If this is the very first player, make them the host.
                    if (finalRoom.players.length === 1) {
                        finalRoom.hostId = socket.id;
                        finalRoom = await finalRoom.save();
                    }

                    console.log(`Player ${nickname} (${socket.id}) joined room ${roomId}`);
                    io.to(roomId).emit('roomUpdate', finalRoom);
                } else {
                    // If the update failed, it's because a condition wasn't met.
                    // Check the room state again to send a specific error.
                    const room = await Room.findOne({ roomId });
                    if (!room) return socket.emit('error', 'Room not found');

                    // This handles the second "join" request from developer mode; just send the room data.
                    if (room.players.some(p => p.socketId === socket.id)) {
                        console.log(`Player ${socket.id} already in room ${roomId}. Sending update.`);
                        socket.join(roomId);
                        socket.data.roomId = roomId;
                        return io.to(socket.id).emit('roomUpdate', room);
                    }
                    if (room.gameState !== 'lobby') return socket.emit('error', 'This game has already started.');
                    if (room.players.length >= room.maxPlayers) return socket.emit('error', 'This room is full.');
                }

            } catch (err) {
                console.error("Error during joinRoom:", err);
                socket.emit('error', 'Server error during join');
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

                            // --- NEW: AI CASTS A VOTE ---
                            // Get a list of all human players
                            const humanPlayers = roomToEnd.players;
                            if (humanPlayers.length > 0) {
                                // Pick a random human player to vote for
                                const randomTarget = humanPlayers[Math.floor(Math.random() * humanPlayers.length)];

                                // Create the AI's vote and add it to the votes array
                                const aiVote = {
                                    voterSocketId: 'AI_PLAYER_ID',
                                    votedForSocketId: randomTarget.socketId
                                };
                                roomToEnd.votes.push(aiVote);
                                console.log(`AI in room ${roomId} voted for ${randomTarget.nickname}`);
                            }
                            // --- END OF NEW LOGIC ---

                            await roomToEnd.save();
                            io.to(roomId).emit('roomUpdate', roomToEnd);
                            console.log(`Voting has started in room ${roomId}.`);

                            // Start the 30-second voting timer
                            setTimeout(() => {
                                tallyVotesAndEndGame(roomId, io);
                            }, 30 * 1000);
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
                if (room.votes.length === room.players.length + 1) {
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


        socket.on('leaveRoom', async ({ roomId }) => {
            await handlePlayerLeave(socket, roomId, io);
        });

        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${socket.id}`);
            const roomId = socket.data.roomId;
            await handlePlayerLeave(socket, roomId, io);
        });
    });
};

export default registerSocketHandlers;