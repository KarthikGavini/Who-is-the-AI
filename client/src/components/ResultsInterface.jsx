// src/components/ResultsInterface.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../socket';

function ResultsInterface({ results, isHost, roomId, players }) {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);

  const handlePlayAgain = () => {
    setReady(true);
    socket.emit('playAgain', { roomId });
  };

  const handleReturnHome = () => {
    // Note: It's good practice to disconnect when leaving the game entirely
    socket.disconnect();
    navigate('/');
  };

  if (!results) {
    return <div className="flex items-center justify-center min-h-screen">Loading results...</div>;
  }
  
  const getNickname = (socketId) => {
    const player = players.find(p => p.socketId === socketId);
    return player ? player.nickname : 'Unknown Player';
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-lg text-center">
        
        {results.playersWin ? (
          <h2 className="text-4xl font-bold text-green-500 mb-4">Humans Win! ✅</h2>
        ) : (
          <h2 className="text-4xl font-bold text-red-500 mb-4">The AI Wins! 🤖</h2>
        )}

        <div className="text-lg text-gray-700 space-y-2 mb-6">
          <p>The AI Impostor was: <strong className="font-bold">{results.aiPlayer?.nickname}</strong></p>
          <p>The player voted out was: <strong className="font-bold">{results.votedOutPlayer?.nickname || 'No one'}</strong></p>
        </div>

        <div className="w-full bg-gray-50 p-4 rounded-md border mb-6">
          <h3 className="text-xl font-semibold mb-3">Vote Tally</h3>
          <ul className="space-y-1 text-left">
            {Object.entries(results.voteCounts).map(([votedForId, count]) => (
              <li key={votedForId}>
                <strong>{getNickname(votedForId)}</strong> received {count} vote(s)
              </li>
            ))}
          </ul>
        </div>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={handlePlayAgain}
            disabled={ready}
            className="w-full p-3 rounded-md text-white font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {ready ? "Waiting for other players..." : "Play Again"}
          </button>
          <button
            onClick={handleReturnHome}
            className="w-full p-3 rounded-md text-gray-700 font-bold bg-gray-200 hover:bg-gray-300 transition-colors"
          >
            Exit to Home
          </button>
        </div>

      </div>
    </div>
  );
}

export default ResultsInterface;