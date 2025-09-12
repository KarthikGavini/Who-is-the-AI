import Room from '../../models/Room.js';
import { tallyVotesAndEndGame } from '../utils/gameUtils.js';

export const registerVoteHandlers = (io, socket) => {
    // socket.on('castVote', async (payload) => { /* ...logic... */ });

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
};