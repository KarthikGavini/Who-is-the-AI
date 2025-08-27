// src/components/VotingInterface.jsx
import React, { useState } from 'react';
import { socket } from '../socket';

// We receive gameData and roomId as props from LobbyPage
function VotingInterface({ gameData, roomId }) {
  const [votedForSocketId, setVotedForSocketId] = useState(null);

  const handleVote = (targetSocketId) => {
    // Prevent voting more than once
    if (votedForSocketId) return;

    // Set local state to give immediate feedback
    setVotedForSocketId(targetSocketId);

    // Emit the vote to the server
    socket.emit('castVote', { roomId, votedForSocketId: targetSocketId });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
        {votedForSocketId ? (
          <>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Vote Cast!</h2>
            <p className="text-lg text-gray-600">Waiting for other players to vote...</p>
            <div className="mt-6 w-16 h-16 border-4 border-dashed rounded-full animate-spin border-blue-500 mx-auto"></div>
          </>
        ) : (
          <>
            <h2 className="text-3xl font-bold mb-2 text-gray-800">Time's Up!</h2>
            <p className="text-lg text-gray-600 mb-8">Vote for who you think the AI Impostor is.</p>
            <div className="w-full flex flex-col gap-3">
              {gameData.players.map((player) => (
                <button
                  key={player.socketId}
                  onClick={() => handleVote(player.socketId)}
                  // You can't vote for yourself
                  disabled={player.socketId === socket.id}
                  className="w-full p-4 rounded-md text-white font-bold text-lg bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {player.nickname}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default VotingInterface;