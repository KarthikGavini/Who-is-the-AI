// src/pages/LobbyPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { socket } from '../socket';
import GameInterface from '../components/GameInterface';
import VotingInterface from '../components/VotingInterface';
import ResultsInterface from '../components/ResultsInterface';

function LobbyPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const { nickname } = location.state || { nickname: 'Guest' };

  const [room, setRoom] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [isAI, setIsAI] = useState(false);
  // REMOVED: The separate 'results' state is no longer needed.
  const handleSettingsChange = (e) => {
      const { name, value } = e.target;
      socket.emit('updateGameSettings', {
        roomId,
        [name]: parseInt(value, 10), // Use parseInt to send a number
      });
  };

   // --- ADD THIS HELPER FUNCTION ---
    const formatDuration = (seconds) => {
      if (seconds < 60) return `${seconds} seconds`;
      const minutes = seconds / 60;
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    };

  useEffect(() => {
    // --- THIS FUNCTION IS NOW FIXED ---
    const handleRoomUpdate = (updatedRoom) => {
      console.log('Received room update:', updatedRoom);

      // De-duplicate players just in case
      const uniquePlayers = Array.from(new Map(updatedRoom.players.map(player => [player.socketId, player])).values());
      updatedRoom.players = uniquePlayers;

      setRoom(prevRoom => {
        // If the game is finished, a generic update (like a player leaving) shouldn't
        // wipe our results. We merge the new data into the old state.
        if (prevRoom && prevRoom.gameState === 'finished' && updatedRoom.gameState === 'finished') {
          return {
            ...prevRoom,      // Keep old data (like .results)
            ...updatedRoom,   // Overwrite with new data (like .players)
          };
        }
        // Otherwise, for all other transitions (e.g., going back to lobby),
        // we take the new state from the server directly.
        return updatedRoom;
      });

      if (socket.id === updatedRoom.hostId) setIsHost(true);
    };

    const handleGameStarted = (roomData) => {
      console.log('Game is starting!', roomData);
      const uniquePlayers = Array.from(new Map(roomData.players.map(player => [player.socketId, player])).values());
      roomData.players = uniquePlayers;

      if (socket.id === roomData.aiPlayerSocketId) {
        setIsAI(true);
      }
      setRoom(roomData);
    };

    const handleStartVoting = () => {
      console.log('Voting is starting!');
      setRoom(prevRoom => ({ ...prevRoom, gameState: 'voting' }));
    };

    // --- THIS FUNCTION IS NOW CLEANED UP ---
    const handleGameFinished = (resultsData) => {
      console.log('Game has finished!', resultsData);
      // We only need to update the room state.
      setRoom(prevRoom => ({
        ...prevRoom,
        gameState: 'finished',
        results: resultsData
      }));
    };


    // --- Socket Connection and Event Listeners ---
    function joinRoomOnConnect() { socket.emit('joinRoom', { roomId, nickname }); }

    if (socket.connected) {
      joinRoomOnConnect();
    } else {
      socket.on('connect', joinRoomOnConnect);
    }

    socket.on('roomUpdate', handleRoomUpdate);
    socket.on('gameStarted', handleGameStarted);
    socket.on('startVoting', handleStartVoting);
    socket.on('gameFinished', handleGameFinished);

    return () => {
      socket.off('connect', joinRoomOnConnect);
      socket.off('roomUpdate', handleRoomUpdate);
      socket.off('gameStarted', handleGameStarted);
      socket.off('startVoting', handleStartVoting);
      socket.off('gameFinished', handleGameFinished);
    };
  }, [roomId, nickname]);

  // ... (handleStartGame function is unchanged)
  const handleStartGame = () => {
    socket.emit('startGame', { roomId });
  };

  if (!room) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // --- RENDER LOGIC IS NOW SAFER ---
  switch (room.gameState) {
    case 'playing':
      return <GameInterface gameData={room} roomId={roomId} isAI={isAI} />;
    case 'voting':
      return <VotingInterface gameData={room} roomId={roomId} isAI={isAI} />;
    case 'finished':
      // Add a check to ensure results exist before rendering the component.
      // This prevents errors and shows a fallback loading message.
      return room.results
        ? <ResultsInterface results={room.results} isHost={isHost} roomId={roomId} players={room.players} />
        : <div className="flex items-center justify-center min-h-screen">Loading results...</div>;
    case 'lobby':
    default:
      return (
        // The lobby JSX is unchanged
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Lobby</h1>
            <p className="text-gray-600 mb-4">
              Share Code: <strong className="text-blue-600 tracking-widest">{roomId}</strong>
            </p>

            {/* --- ADD THIS NEW JSX BLOCK FOR HOST SETTINGS --- */}
            {isHost && (
              <div className="grid grid-cols-2 gap-4 my-4 text-left border-t border-b py-4">
                <div>
                  <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-700">Max Players</label>
                  <select
                    id="maxPlayers"
                    name="maxPlayers"
                    value={room.maxPlayers}
                    onChange={handleSettingsChange}
                    className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm"
                  >
                    <option value="3">3</option>
                    <option value="4">4</option>
                    <option value="5">5</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="gameDuration" className="block text-sm font-medium text-gray-700">Duration</label>
                  <select
                    id="gameDuration"
                    name="gameDuration"
                    value={room.gameDuration}
                    onChange={handleSettingsChange}
                    className="mt-1 block w-full p-2 border border-gray-300 bg-white rounded-md shadow-sm"
                  >
                    <option value="10">10 sec</option>
                    <option value="60">1 min</option>
                    <option value="120">2 min</option>
                    <option value="180">3 min</option>
                    <option value="240">4 min</option>
                    <option value="300">5 min</option>
                  </select>
                </div>
              </div>
            )}
            {/* --- END OF NEW JSX BLOCK --- */}
            {!isHost && (
              <div className="text-left my-4 border-t border-b py-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">Game Settings</h3>
                <div className="space-y-1 text-gray-600">
                  <p><strong>Max Players:</strong> {room.maxPlayers}</p>
                  <p><strong>Duration:</strong> {formatDuration(room.gameDuration)}</p>
                </div>
              </div>
            )}

            <div className="bg-gray-50 p-4 rounded-md border min-h-[200px]">
              <h2 className="text-xl font-semibold mb-3 text-left">Players ({room.players.length})</h2>
              <ul className="space-y-2">
                {room.players.map((player) => (
                  <li key={player.socketId} className="text-left p-3 bg-white rounded shadow-sm font-medium flex items-center">
                    {player.nickname}
                    {player.socketId === room.hostId && <span className="ml-2 text-xs font-bold text-yellow-500">(Host) 👑</span>}
                  </li>
                ))}
              </ul>
            </div>

            {isHost && room.players.length > 1 && (
              <button
                onClick={handleStartGame}
                className="w-full mt-4 p-3 rounded-md text-white font-bold bg-green-600 hover:bg-green-700 transition-colors"
              >
                Start Game ({room.players.length} players)
              </button>
            )}
          </div>
        </div>
      );
  }
}

export default LobbyPage;