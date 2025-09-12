import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from 'socket.io';

// Import our refactored modules
import connectDB from './config/db.js';
import { chloe_model } from './config/gemini.js';
import roomRoutes from './routes/roomRoutes.js';
import registerSocketHandlers from './socket/socketHandler.js'; 

dotenv.config();

// Connect to Database
connectDB();

const app = express();
const port = process.env.PORT || 5002;

// --- 1. CREATE A WHITELIST OF ALLOWED URLS ---
const allowedOrigins = [
    'https://who-is-the-ai.vercel.app', // Your deployed Vercel URL
    'http://localhost:5173'             // Your local development URL
];

// --- 2. UPDATE CORS OPTIONS TO USE THE WHITELIST ---
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
};

app.use(cors(corsOptions));
app.use(express.json());
app.use('/api/rooms', roomRoutes);

// Server & Socket.IO Setup
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "https://your-live-vercel-url.app", // Make sure this is your correct URL
        methods: ["GET", "POST"]
    }
});

// Register all socket event handlers, passing in the AI model
registerSocketHandlers(io, chloe_model);

// Start Listening
server.listen(port, () => {
    console.log(`Server running on port: ${port}`);
});