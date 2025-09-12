import React, { useState, useMemo } from 'react';
import { socket } from '../socket';
import { motion, AnimatePresence } from 'framer-motion';

// Using the same color palette for consistency with the game interface
const playerColors = [
    '#ef4444', // red-500
    '#22d3ee', // cyan-400
    '#4ade80', // green-400
    '#facc15', // yellow-400
    '#ec4899', // pink-400
    '#818cf8', // indigo-400
];

function VotingInterface({ gameData, roomId }) {
  const [hasVoted, setHasVoted] = useState(false);

  const anonymousPlayersMap = useMemo(() =>
    new Map(Object.entries(gameData.anonymousPlayers || {})),
    [gameData.anonymousPlayers]
  );

  const playerColorMap = useMemo(() => {
    const map = new Map();
    let colorIndex = 0;
    for (const id of anonymousPlayersMap.keys()) {
      map.set(id, playerColors[colorIndex % playerColors.length]);
      colorIndex++;
    }
    return map;
  }, [anonymousPlayersMap]);

  const votablePlayers = useMemo(() =>
    Array.from(anonymousPlayersMap.entries())
      .map(([id, name]) => ({ id, name }))
      .filter(p => p.id !== socket.id),
    [anonymousPlayersMap]
  );

  const handleVote = (votedForId) => {
    if (hasVoted) return;
    setHasVoted(true);
    socket.emit('castVote', {
      roomId,
      votedForSocketId: votedForId
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#05040a] to-[#0c1636] text-gray-200 font-sans p-4">
      <AnimatePresence mode="wait">
        {hasVoted ? (
          // --- VIBRANT WAITING SCREEN ---
          <motion.div
            key="waiting"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-md text-center"
          >
            <div className="bg-slate-900/40 backdrop-blur-lg p-8 rounded-2xl shadow-2xl ring-1 ring-cyan-400/30 shadow-cyan-500/10">
              <h1 className="text-3xl font-bold mb-4 text-white">Vote Submitted!</h1>
              <p className="text-lg text-gray-400">Waiting for other players to vote...</p>
              <div className="flex justify-center items-center gap-2 mt-8">
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7]}} transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }} className="w-4 h-4 bg-cyan-400 rounded-full" />
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7]}} transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.2 }} className="w-4 h-4 bg-cyan-400 rounded-full" />
                <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7]}} transition={{ duration: 1, repeat: Infinity, ease: "easeInOut", delay: 0.4 }} className="w-4 h-4 bg-cyan-400 rounded-full" />
              </div>
            </div>
          </motion.div>
        ) : (
          // --- HIGH-CONTRAST VOTING SCREEN ---
          <motion.div
            key="voting"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-2xl"
          >
            <div className="bg-slate-900/40 backdrop-blur-lg p-6 sm:p-8 rounded-2xl shadow-2xl ring-1 ring-cyan-400/30 shadow-cyan-500/20 text-center">
              <div className="flex justify-center items-center gap-3 mb-4">
                <h1 className="text-3xl sm:text-4xl font-bold text-white" style={{textShadow: '0 0 20px #22d3ee'}}>Who is the AI?</h1>
              </div>
              <p className="text-gray-400 mb-8">Select the player you believe is the computer.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {votablePlayers.map((player) => {
                  const playerColor = playerColorMap.get(player.id) || '#ffffff';
                  return (
                    <motion.button
                      key={player.id}
                      onClick={() => handleVote(player.id)}
                      className="group w-full p-4 flex items-center justify-center gap-3 bg-gradient-to-br from-gray-800/80 to-slate-900/70 border border-gray-700 text-white font-bold rounded-xl text-xl transition-all duration-300"
                      style={{'--glow-color': playerColor}}
                      whileHover={{ 
                        scale: 1.05,
                        boxShadow: `0 0 25px 5px var(--glow-color)`,
                        borderColor: playerColor,
                        background: 'linear-gradient(to bottom right, #1f2937, #111827)' // Darkens slightly on hover
                      }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 group-hover:text-white transition-colors duration-300"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                      <span>{player.name}</span>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default VotingInterface;

