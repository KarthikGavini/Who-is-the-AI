// src/components/ResultsInterface.jsx
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../socket';

function ResultsInterface({ results, roomId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { nickname } = location.state || { nickname: 'Guest' };

  useEffect(() => {
    // Listen for the server's instruction to navigate to the new lobby
    const handleNavigate = (newRoomId) => {
      navigate(`/lobby/${newRoomId}`, { state: { nickname } });
    };

    socket.on('navigateToNewLobby', handleNavigate);

    return () => {
      socket.off('navigateToNewLobby', handleNavigate);
    };
  }, [navigate, nickname]);

  // --- ADD THIS NEW useEffect FOR DEBUGGING ---
  useEffect(() => {
    const onConnect = () => console.log('[Socket Status] Connected!');
    const onDisconnect = () => console.log('[Socket Status] Disconnected!');
    const onConnectError = (err) => console.log('[Socket Status] Connection Error:', err.message);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    // Log the current status when the component loads
    console.log(`[Socket Status] Results screen loaded. Socket is ${socket.connected ? 'connected' : 'disconnected'}.`);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };
  }, []); // Empty array ensures this runs only once when the component mounts

  const handlePlayAgain = () => {
    // Tell the server we want to play again
    console.log(`"Play Again" clicked. Emitting 'findOrCreateLobby' for old room: ${roomId}`);
    socket.emit('findOrCreateLobby', { oldRoomId: roomId });
  };

  const handleExit = () => {
    navigate('/');
  };

  if (!results) {
    return <div className="flex items-center justify-center min-h-screen">Loading results...</div>;
  }

  const { aiPlayerName, votedOutName, playersWin, voteBreakdown } = results;

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl w-full max-w-lg text-center">
        <h1 className={`text-5xl font-extrabold mb-4 ${playersWin ? 'text-green-400' : 'text-red-500'}`}>
          {playersWin ? 'Humans Win!' : 'The AI Wins!'}
        </h1>

        <div className="bg-gray-700 p-6 rounded-lg mb-6 text-xl space-y-2">
          <p>The AI was <span className="font-bold text-blue-400">{aiPlayerName}</span>.</p>
          <p>You voted out <span className="font-bold text-yellow-400">{votedOutName}</span>.</p>
        </div>

        <div className="text-left mb-8">
          <h2 className="text-2xl font-bold mb-3 border-b border-gray-600 pb-2">Vote Tally</h2>
          <ul className="space-y-2">
            {Object.entries(voteBreakdown).map(([votedFor, voters]) => (
              <li key={votedFor}>
                <span className="font-bold text-yellow-400">{votedFor}</span> was voted for by: <span className="text-gray-300">{voters.join(', ')}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-center space-x-4">
          <button onClick={handlePlayAgain} className="px-8 py-3 bg-green-600 font-bold rounded-lg text-xl hover:bg-green-700 transition-transform transform hover:scale-105">
            Play Again
          </button>
          <button onClick={handleExit} className="px-8 py-3 bg-gray-600 font-bold rounded-lg text-xl hover:bg-gray-500 transition-transform transform hover:scale-105">
            Exit to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResultsInterface;