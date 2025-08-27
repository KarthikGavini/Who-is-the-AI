// src/components/VotingInterface.jsx
import React, { useState, useMemo } from 'react';
import { socket } from '../socket';

function VotingInterface({ gameData, roomId }) {
  const [hasVoted, setHasVoted] = useState(false);

  // Create a map of all anonymous players for easy lookups
  const anonymousPlayersMap = useMemo(() =>
    new Map(Object.entries(gameData.anonymousPlayers || {})),
    [gameData.anonymousPlayers]
  );

  // Create a list of all participants, but filter yourself out so you can't self-vote
  const votablePlayers = useMemo(() =>
    Array.from(anonymousPlayersMap.entries())
      .map(([id, name]) => ({ id, name }))
      .filter(p => p.id !== socket.id),
    [anonymousPlayersMap]
  );

  const handleVote = (votedForId) => {
    if (hasVoted) return; // Prevent voting more than once
    setHasVoted(true);
    socket.emit('castVote', {
      roomId,
      votedForSocketId: votedForId
    });
  };

  // After voting, show a waiting screen
  if (hasVoted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 text-white p-4">
        <div className="bg-gray-700 p-8 rounded-xl shadow-lg text-center">
          <h1 className="text-3xl font-bold mb-4">Vote Cast!</h1>
          <p className="text-xl">Waiting for other players to vote...</p>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mt-6"></div>
        </div>
      </div>
    );
  }

  // The main voting screen
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-800 text-white p-4">
      <div className="bg-gray-700 p-8 rounded-xl shadow-lg text-center w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2">Who is the AI?</h1>
        <p className="text-gray-300 mb-6">Vote for the player you think is the imposter.</p>
        <div className="grid grid-cols-1 gap-4">
          {votablePlayers.map((player) => (
            <button
              key={player.id}
              onClick={() => handleVote(player.id)}
              className="w-full p-4 bg-blue-600 text-white font-bold rounded-lg text-xl hover:bg-blue-700 transition-transform transform hover:scale-105"
            >
              {player.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default VotingInterface;