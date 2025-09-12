import React, {useEffect} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { socket } from '../socket';
import { motion } from 'framer-motion';

function ResultsInterface({ results, roomId }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { nickname } = location.state || { nickname: 'Guest' };

  useEffect(() => {
    const handleNavigate = (newRoomId) => {
      navigate(`/lobby/${newRoomId}`, { state: { nickname, hasJoined: true } });
    };

    socket.on('navigateToNewLobby', handleNavigate);

    return () => {
      socket.off('navigateToNewLobby', handleNavigate);
    };
  }, [navigate, nickname]);

  useEffect(() => {
    const onConnect = () => console.log('[Socket Status] Connected!');
    const onDisconnect = () => console.log('[Socket Status] Disconnected!');
    const onConnectError = (err) => console.log('[Socket Status] Connection Error:', err.message);

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onConnectError);

    console.log(`[Socket Status] Results screen loaded. Socket is ${socket.connected ? 'connected' : 'disconnected'}.`);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onConnectError);
    };
  }, []);

  const handlePlayAgain = () => {
    console.log(`"Play Again" clicked. Emitting 'findOrCreateLobby' for old room: ${roomId}`);
    sessionStorage.removeItem('hasJoinedRoom');
    socket.emit('findOrCreateLobby', { oldRoomId: roomId });
  };

  const handleExit = () => {
    sessionStorage.removeItem('hasJoinedRoom');
    navigate('/');
  };

  if (!results) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#05040a] to-[#0c1636] text-white p-4">
            <h1 className="text-2xl mb-4">Loading results...</h1>
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 border-4 border-cyan-500/30 rounded-full"></div>
                <div className="absolute inset-0 border-t-4 border-cyan-500 rounded-full animate-spin"></div>
            </div>
        </div>
    );
  }

  const { aiPlayerName, votedOutName, playersWin, voteBreakdown } = results;
  const resultColor = playersWin ? '#4ade80' : '#ef4444'; // Green for win, Red for loss
  const resultTextColor = playersWin ? 'text-green-400' : 'text-red-400';
  const resultShadowColor = playersWin ? 'shadow-green-500/20' : 'shadow-red-500/20';
  const resultRingColor = playersWin ? 'ring-green-400/30' : 'ring-red-400/30';

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-[#05040a] to-[#0c1636] text-white p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={`bg-slate-900/40 backdrop-blur-lg p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-lg text-center ring-1 ${resultRingColor} ${resultShadowColor}`}
      >
        <h1 className={`text-4xl sm:text-5xl font-extrabold mb-4 ${resultTextColor}`} style={{textShadow: `0 0 20px ${resultColor}`}}>
          {playersWin ? 'Humans Win!' : 'The AI Wins!'}
        </h1>

        <div className="bg-black/20 p-4 sm:p-6 rounded-lg mb-6 text-lg sm:text-xl space-y-2 border border-gray-700">
          <p>The AI was <span className="font-bold text-cyan-400">{aiPlayerName}</span>.</p>
          <p>You voted out <span className="font-bold text-yellow-400">{votedOutName}</span>.</p>
        </div>

        <div className="text-left mb-8">
          <h2 className="text-2xl font-bold mb-3 border-b border-gray-600 pb-2">Vote Tally</h2>
          <ul className="space-y-2">
            {Object.entries(voteBreakdown).map(([votedFor, voters]) => (
              <li key={votedFor} className="bg-gray-800/50 p-3 rounded-md border border-gray-700">
                <span className="font-bold text-yellow-400">{votedFor}</span> was voted by: <span className="text-gray-300">{voters.join(', ')}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <motion.button 
            onClick={handlePlayAgain} 
            className="w-full sm:w-auto px-8 py-3 bg-gradient-to-br from-green-600 to-green-700 font-bold rounded-lg text-xl border border-green-500"
            whileHover={{ scale: 1.05, boxShadow: '0 0 20px #4ade80' }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            Play Again
          </motion.button>
          <motion.button 
            onClick={handleExit} 
            className="w-full sm:w-auto px-8 py-3 bg-gray-700 font-bold rounded-lg text-xl border border-gray-600"
            whileHover={{ scale: 1.05, background: '#4b5563', borderColor: '#6b7280' }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
          >
            Exit to Home
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

export default ResultsInterface;

