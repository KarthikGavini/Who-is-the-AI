import mongoose from 'mongoose';

const gameLogSchema = new mongoose.Schema({
    gameId: { type: String, required: true, unique: true },
    theme: { type: String, required: true },
    question: { type: String, required: true },
    participants: [String],
    aiPlayerName: { type: String, required: true },
    chatLog: [{
        sender: String,
        text: String,
        timestamp: Date,
    }],
    votes: [{
        voter: String,
        votedFor: String,
    }],
    votedOutName: { type: String, required: true },
    ai_won: { type: Boolean, required: true },
}, { timestamps: true });

const GameLog = mongoose.model('GameLog', gameLogSchema);

export default GameLog;