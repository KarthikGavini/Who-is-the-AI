// src/pages/LobbyPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate, useBlocker } from 'react-router-dom';
import { socket } from '../socket';
// import { v4 as uuidv4 } from 'uuid';
import GameInterface from '../components/GameInterface';
import VotingInterface from '../components/VotingInterface';
import ResultsInterface from '../components/ResultsInterface';

function LobbyPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const errorHandled = useRef(false);
  const { nickname } = location.state || { nickname: 'Guest' };

  const [room, setRoom] = useState(null);
  const [isHost, setIsHost] = useState(false);
  
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
    const handleBeforeUnload = (event) => {
      // This is the standard way to trigger the browser's confirmation dialog.
      event.preventDefault();
      // The browser will show its own default message.
      event.returnValue = 'Are you sure you want to leave? Your game progress will be lost.';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

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

      // if (socket.id === updatedRoom.hostId) setIsHost(true);
      setIsHost(socket.id === updatedRoom.hostId);
    };

    const handleGameStarted = (roomData) => {
      // console.log('Game is starting!', roomData);
      // const uniquePlayers = Array.from(new Map(roomData.players.map(player => [player.socketId, player])).values());
      // roomData.players = uniquePlayers;

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

    const handleError = (errorMessage) => {
      if (errorHandled.current) return;
      errorHandled.current = true; // Set the flag to true

      alert(`Could not join room: ${errorMessage}`);
      navigate('/');
    };

    socket.on('roomUpdate', handleRoomUpdate);
    socket.on('gameStarted', handleGameStarted);
    socket.on('startVoting', handleStartVoting);
    socket.on('gameFinished', handleGameFinished);
    socket.on('error', handleError);

    // Simplified join logic
    function joinRoomOnConnect() {
      socket.emit('joinRoom', { roomId, nickname });
    }
    if (socket.connected) {
      joinRoomOnConnect();
    } else {
      socket.on('connect', joinRoomOnConnect);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      socket.off('connect', joinRoomOnConnect);
      socket.off('roomUpdate', handleRoomUpdate);
      socket.off('gameStarted', handleGameStarted);
      socket.off('startVoting', handleStartVoting);
      socket.off('gameFinished', handleGameFinished);
      socket.off('error', handleError);
    };
  }, [roomId, nickname, navigate]);

  // ... (handleStartGame function is unchanged)
  const handleStartGame = () => {
    socket.emit('startGame', { roomId });
  };

  const handleQuitLobby = () => {
    socket.emit('leaveRoom', { roomId }); // Tell the server we are leaving
    navigate('/');
  };

  if (!room) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // --- RENDER LOGIC IS NOW SAFER ---
  switch (room.gameState) {
    case 'playing':
      return <GameInterface gameData={room} roomId={roomId} />;
    case 'voting':
      return <VotingInterface gameData={room} roomId={roomId} />;
    case 'finished':
      // Add a check to ensure results exist before rendering the component.
      // This prevents errors and shows a fallback loading message.
      return room.results
        ? <ResultsInterface results={room.results} roomId={roomId} />
        : <div className="flex items-center justify-center min-h-screen">Loading results...</div>;
    case 'lobby':
    default:
      let lobbyStatusText = '';
      if (room.players.length < 2) {
        lobbyStatusText = 'Waiting for at least 2 players...';
      } else if (room.players.length < room.maxPlayers) {
        lobbyStatusText = 'Waiting for more players...';
      } else {
        lobbyStatusText = 'Room is full! Waiting for host to start.';
      }
      return (
        // The lobby JSX is unchanged
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Lobby</h1>
            <p className="text-gray-600 mb-4">
              Share Code: <strong className="text-blue-600 tracking-widest">{roomId}</strong>
            </p>
            {/* --- NEW: Dynamic Status Text --- */}
            <p className="text-lg font-semibold text-gray-700 my-4 p-3 bg-gray-50 rounded-md">
              {lobbyStatusText}
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
              {/* <h2 className="text-xl font-semibold mb-3 text-left">Players ({room.players.length})</h2> */}
              <h2 className="text-xl font-semibold mb-3 text-left">Players ({room.players.length}/{room.maxPlayers})</h2>
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

            {/* --- NEW: Quit Button --- */}
            <button onClick={handleQuitLobby} className="w-full mt-2 p-3 rounded-md text-white font-bold bg-red-600 hover:bg-red-700 transition-colors">
              Quit
            </button>
          </div>
        </div>
      );
  }
}

export default LobbyPage;