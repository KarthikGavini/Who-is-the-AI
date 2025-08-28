// models/Room.js
import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
    socketId: {
        type: String,
        required: true,
    },
    nickname: {
        type: String,
        required: true,
    },
    // playerId: { type: String, required: true },
    ready: {
        type: Boolean,
        default: false,
    }
});

const messageSchema = new mongoose.Schema({
    nickname: { type: String, required: true },
    text: { type: String, required: true },
    socketId: { type: String, required: true },
}, { _id: false, timestamps: true });

// --- NEW VOTE SCHEMA ---
const voteSchema = new mongoose.Schema({
    voterSocketId: {
        type: String,
        required: true,
    },
    votedForSocketId: {
        type: String,
        required: true,
    },
}, { _id: false });

const roomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true,
    },
    players: [playerSchema],
    gameState: {
        type: String,
        required: true,
        default: 'lobby',
    },
    hostId: {
        type: String,
        required: true,
    },
    // --- NEW FIELDS START HERE ---
    currentTheme: {
        type: String,
        default: '',
    },
    currentQuestion: {
        type: String,
        default: '',
    },
    aiPlayerSocketId: {
        type: String,
        default: null, // We'll set this when the game starts
    },
    messages: [messageSchema],

    // gameDuration: {
    //     type: Number,
    //     default: 20, // Default to 120 seconds (2 minutes)
    // },
    votes: [voteSchema],
    results: {
        type: Object,
        default: null,
    },
    maxPlayers: { type: Number, default: 5, min: 3, max: 5 },
    gameDuration: { type: Number, default: 10 }, // Default to 180 seconds (3 minutes)
    anonymousPlayers: {
        type: Map,
        of: String, // e.g., { "Mhi9Pd...": "Player 1", "AI_PLAYER_ID": "Player 2" }
        default: {}
    },
    // --- NEW FIELDS END HERE ---
}, { timestamps: true });

const Room = mongoose.model('Room', roomSchema);

export default Room;