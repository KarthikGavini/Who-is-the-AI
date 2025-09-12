import Room from '../../models/Room.js';
import GameLog from '../../models/GameLog.js';

export const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

export const tallyVotesAndEndGame = async (roomId, io) => {
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

        // --- NEW DATA LOGGING LOGIC STARTS HERE ---
        try {
            const gameLog = new GameLog({
                gameId: room.roomId,
                theme: room.currentTheme,
                question: room.currentQuestion,
                participants: Array.from(anonymousPlayersMap.values()),
                aiPlayerName: anonymousPlayersMap.get(room.aiPlayerSocketId) || 'Unknown AI',
                chatLog: room.messages.map(msg => ({
                    sender: anonymousPlayersMap.get(msg.socketId) || 'Unknown Player',
                    text: msg.text,
                    timestamp: msg.timestamp,
                })),
                votes: room.votes.map(vote => ({
                    voter: anonymousPlayersMap.get(vote.voterSocketId) || 'Unknown Voter',
                    votedFor: anonymousPlayersMap.get(vote.votedForSocketId) || 'Unknown Votee',
                })),
                votedOutName: anonymousPlayersMap.get(votedOutSocketId) || 'No one',
                ai_won: !playersWin,
            });

            await gameLog.save();
            console.log(`[Data Logging] Game data for room ${roomId} saved successfully.`);
        } catch (logError) {
            console.error(`[Data Logging] FAILED to save game log for room ${roomId}:`, logError);
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