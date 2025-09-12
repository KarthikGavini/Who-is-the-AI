import Room from '../../models/Room.js';
import { gameContent } from '../../gameContent.js';
import { shuffleArray, tallyVotesAndEndGame } from '../utils/gameUtils.js';

const aiResponseTimers = new Map();

export const registerGameHandlers = (io, socket, chloe_model) => {
    // socket.on('startGame', async (payload) => { /* ...logic... */ });
    // socket.on('sendMessage', async (payload) => { /* ...logic... */ });

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

            room.gameStartTime = new Date().toISOString();

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

            // 1. Identify the sender's anonymous name.
            const senderAnonymousName = room.anonymousPlayers.get(socket.id);
            if (!senderAnonymousName) return;

            // 2. Save and broadcast the human's message WITH A TIMESTAMP.
            const humanMessage = {
                nickname: senderAnonymousName,
                text: messageText,
                socketId: socket.id,
                timestamp: new Date(), // <-- Add timestamp here
            };
            room.messages.push(humanMessage);
            await room.save(); // Save the message immediately
            io.to(roomId).emit('newMessage', humanMessage);

            // --- NEW TIMER LOGIC STARTS HERE ---

            // 3. Clear any existing timer for this room. This prevents the AI from responding if humans are chatting quickly.
            if (aiResponseTimers.has(roomId)) {
                clearTimeout(aiResponseTimers.get(roomId));
            }

            // 4. Set a new timer. The AI will only "think" after a pause in conversation.
            const thinkingTimer = setTimeout(async () => {
                try {
                    // We need to fetch the room again to get the most up-to-date message list
                    const currentRoom = await Room.findOne({ roomId });
                    if (!currentRoom || currentRoom.gameState !== 'playing') return;

                    const now = new Date();
                    const historyForAI = currentRoom.messages.map(msg => {
                        const authorName = currentRoom.anonymousPlayers.get(msg.socketId) || 'Unknown Player';
                        const timeAgo = Math.round((now - new Date(msg.timestamp)) / 1000); // Time in seconds
                        return {
                            role: msg.socketId === 'AI_PLAYER_ID' ? "model" : "user",
                            parts: [{ text: `[${authorName} - ${timeAgo}s ago]: ${msg.text}` }], // <-- Add formatted timestamp
                        };
                    });

                    // in socketHandler.js, inside the thinkingTimer setTimeout

                    const aiPrompt = `
                            You are ${currentRoom.anonymousPlayers.get('AI_PLAYER_ID')}. The theme is "${currentRoom.currentTheme}".
                            Analyze the recent chat history with timestamps. First, decide if you should respond. Second, if you do respond, choose the most human-like and strategic message style from your guide.
                            Provide your decision in JSON format ONLY.

                            Example (Speak, Short):
                            {
                            "shouldRespond": true,
                            "reasoning": "Player 1 made a joke. A short, natural laugh is the best response to build rapport.",
                            "responseStyle": "short",
                            "response": "lol good one"
                            }

                            Example (Speak, Accusation):
                            {
                            "shouldRespond": true,
                            "reasoning": "This is a good moment to cast suspicion on Player 3. Their last two messages were contradictory. I will use the full accusation format.",
                            "responseStyle": "accusation",
                            "response": "Okay, I'm confused about Player 3. First they said they liked the theme, but now they're saying it's boring. Doesn't that seem like a bot trying to agree with everyone? What do you all think?"
                            }

                            Example (Silent):
                            {
                            "shouldRespond": false,
                            "reasoning": "The conversation is flowing fine without me. I will stay silent to avoid seeming too eager.",
                            "responseStyle": null,
                            "response": null
                            }

                            Your decision now:
                            `;

                    const chat = chloe_model.startChat({ history: historyForAI });
                    const result = await chat.sendMessage(aiPrompt);
                    const aiResponseText = result.response.text();

                    const cleanedJsonString = aiResponseText.replace(/```json|```/g, '').trim();
                    const aiDecision = JSON.parse(cleanedJsonString);

                    if (aiDecision.shouldRespond && aiDecision.response) {
                        console.log(`AI chose to respond. Reason: ${aiDecision.reasoning}`);
                        const aiAnonymousName = currentRoom.anonymousPlayers.get('AI_PLAYER_ID');
                        const aiMessage = {
                            nickname: aiAnonymousName,
                            text: aiDecision.response,
                            socketId: 'AI_PLAYER_ID',
                            timestamp: new Date(),
                        };
                        currentRoom.messages.push(aiMessage);
                        await currentRoom.save();

                        setTimeout(() => {
                            io.to(roomId).emit('newMessage', aiMessage);
                        }, 1500);
                    } else {
                        console.log(`AI chose to stay silent. Reason: ${aiDecision.reasoning}`);
                    }
                } catch (err) {
                    console.error("Error inside AI thinking timer:", err);
                } finally {
                    aiResponseTimers.delete(roomId); // Clean up the map once the timer is done
                }
            }, Math.random() * 8000 + 3000); // Random delay between 7 to 12 seconds

            aiResponseTimers.set(roomId, thinkingTimer);

        } catch (err) {
            console.error("Error in sendMessage handler:", err);
        }
    });
};