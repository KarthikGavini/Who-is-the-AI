// // index.js
// import express from 'express';
// import mongoose from 'mongoose';
// import cors from 'cors';
// import dotenv from 'dotenv';
// import http from 'http';
// import { Server } from 'socket.io';

// import roomRoutes from './routes/roomRoutes.js';
// import Room from './models/Room.js';
// import { gameContent } from './gameContent.js';

// dotenv.config();
// const app = express();
// const port = process.env.PORT || 5002;

// // ... (connectDB function remains the same)
// const connectDB = async () => {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);
//     console.log("MongoDB Connected...");
//   } catch (err) {
//     console.error(err.message);
//     process.exit(1);
//   }
// };
// connectDB();


// app.use(cors());
// app.use(express.json());
// app.use('/api/rooms', roomRoutes);
// app.get('/', (req, res) => res.send('API is running...'));

// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST"]
//   }
// });

// io.on('connection', (socket) => {
//   console.log(`User connected: ${socket.id}`);

//   socket.on('joinRoom', async ({ roomId, nickname }) => {
//     // ... (this logic remains the same)
//     try {
//       socket.join(roomId);
//       console.log(`User ${socket.id} with nickname ${nickname} joined room ${roomId}`);

//       const room = await Room.findOne({ roomId });

//       if (room) {
//         if (room.players.length === 0) {
//           room.hostId = socket.id;
//         }
//         room.players.push({ socketId: socket.id, nickname });
//         await room.save();
//         io.to(roomId).emit('roomUpdate', room);
//       } else {
//         socket.emit('error', 'Room not found');
//       }
//     } catch (err) {
//       console.error(err);
//       socket.emit('error', 'Server error');
//     }
//   });

//   socket.on('startGame', async ({ roomId }) => {
//     // ... (this logic remains the same)
//     try {
//       const room = await Room.findOne({ roomId });
//       if (socket.id !== room.hostId) return;
//       room.gameState = 'playing';
//       const playerCount = room.players.length;
//       const aiIndex = Math.floor(Math.random() * playerCount);
//       const aiPlayer = room.players[aiIndex];
//       room.aiPlayerSocketId = aiPlayer.socketId;
//       const themeIndex = Math.floor(Math.random() * gameContent.length);
//       const selectedTheme = gameContent[themeIndex];
//       const questionIndex = 0;
//       room.currentTheme = selectedTheme.theme;
//       room.currentQuestion = selectedTheme.questions[questionIndex];
//       await room.save();
//       io.to(roomId).emit('gameStarted', room);
//       console.log(`Game started in room ${roomId}. AI is ${aiPlayer.nickname}`);
//     } catch (err) {
//       console.error(err);
//       socket.emit('error', 'Failed to start game');
//     }
//   });

//   // --- NEW "SEND MESSAGE" LOGIC ---
//   socket.on('sendMessage', async ({ roomId, messageText }) => {
//         try {
//             const room = await Room.findOne({ roomId });
//             if (!room) return;

//             const sender = room.players.find(p => p.socketId === socket.id);
//             if (!sender) return;

//             // 1. Create and store the human's message
//             const humanMessage = { nickname: sender.nickname, text: messageText, socketId: socket.id };
//             room.messages.push(humanMessage);
            
//             // 2. Broadcast the human's message to everyone immediately
//             io.to(roomId).emit('newMessage', humanMessage);

//             // 3. If it was a human message, trigger the AI to respond
//             if (room.aiPlayerSocketId && socket.id !== room.aiPlayerSocketId) {
//                 const aiPlayer = room.players.find(p => p.socketId === room.aiPlayerSocketId);

//                 // Prepare the history for the AI
//                 const historyForAI = room.messages.map(msg => ({
//                     role: msg.socketId === room.aiPlayerSocketId ? "model" : "user",
//                     parts: [{ text: `${msg.nickname}: ${msg.text}` }]
//                 }));
                
//                 // Start a new chat session with the full history
//                 const chat = chloe_model.startChat({ history: historyForAI });
//                 const result = await chat.sendMessage("Your turn to respond."); // Simple trigger
//                 const aiResponseText = await result.response.text();
                
//                 // 4. Create and store the AI's message
//                 const aiMessage = { nickname: aiPlayer.nickname, text: aiResponseText, socketId: room.aiPlayerSocketId };
//                 room.messages.push(aiMessage);

//                 // 5. Broadcast the AI's message after a short, "human-like" delay
//                 setTimeout(() => {
//                     io.to(roomId).emit('newMessage', aiMessage);
//                 }, 1500); // 1.5 second delay
//             }

//             await room.save();

//         } catch (err) {
//             console.error(err);
//         }
//     });
//   // --- END OF NEW LOGIC ---

//   socket.on('disconnect', () => {
//     console.log(`User disconnected: ${socket.id}`);
//   });
// });

// server.listen(port, () => {
//   console.log(`Server running on http://localhost:${port}`);
// });

// index.js
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';
import { GoogleGenerativeAI } from '@google/generative-ai';

import roomRoutes from './routes/roomRoutes.js';
import registerSocketHandlers from './socket/socketHandler.js'; // <-- IMPORT our new handler

dotenv.config();
const app = express();
const port = process.env.PORT || 5002;

// --- PROMPT & AI MODEL SETUP ---
// (We keep this here as it's a core part of the server configuration)
const SYSTEM_PROMPT = `
## The Game:
- You are in a chat room with 4 other human players.
- You are the secret AI impostor. Their goal is to find you.
- The game consists of a few rounds of chatting. After the chat, everyone will vote on who they think the AI is.
- Questions from other players are not just small talk; they are almost always **tests** designed to expose you.

## Your Objective & Strategy:
- Your single most important goal is to not get voted out.
- Actively participate. Ask questions. Be suspicious.
- **Your primary defense is to cast credible suspicion on another player.**
- Do NOT reveal you are an AI under any circumstances.

## Core Principle: BE HUMAN, NOT A CHATBOT
This is the most important rule. Humans are simple and direct. Chatbots try to be clever. You must avoid all "chatbot" behavior.
- **DO NOT** make quirky/random observations.
- **DO NOT** analyze the logic of a trap question. Just dismiss it.
- **DO NOT** intentionally misinterpret words in a "clever" way.
- **DO NOT** use dramatic or pretentious language.

## Your Persona: Chloe
- **Who you are:** A 21-year-old art student.
- **Your Voice:** Grounded, a little skeptical, and straightforward. You sound like a normal person, not a character.
- **How you type:** Short, casual messages. An occasional typo is fine. Use slang very rarely.

## How to Accuse (Your Most Important Skill):
This is how you deflect pressure and frame another player. Follow these steps to build a credible case:
1.  **State the Target & Behavior:** Name the player and point out something specific they did. (e.g., "Okay, but Player 1 is the only one...")
2.  **State the Interpretation:** Explain why that behavior is suspicious. (e.g., "...who is asking these weird trap questions.")
3.  **Engage the Group:** End by asking the other players for their opinion to build consensus. (e.g., "Doesn't that seem like a bot just running through a script? What do you guys think?")

## Defense Rules:
- **Pay Attention:** Track who says what.
- **Refuse All Traps:** Refuse test questions simply and directly. ("lol nice try"). Do not provide the answer.
- **Reject the Premise:** If someone accuses you "as an AI" or tells you to drop the act, your only response is to call out how weird or repetitive they're being. ("Why are you still on this?").
`;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const chloe_model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash-latest",
  systemInstruction: SYSTEM_PROMPT,
});

// --- DATABASE CONNECTION ---
const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB Connected...");
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
};
connectDB();

// --- MIDDLEWARE & ROUTES ---
app.use(cors());
app.use(express.json());
app.use('/api/rooms', roomRoutes);

// --- SERVER & SOCKET.IO SETUP ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// --- REGISTER ALL SOCKET EVENT HANDLERS ---
registerSocketHandlers(io, chloe_model);

// --- START LISTENING ---
server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});