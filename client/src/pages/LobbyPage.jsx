// src/pages/LobbyPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { socket } from '../socket';
import GameInterface from '../components/GameInterface';
import VotingInterface from '../components/VotingInterface'; // <-- Import
import ResultsInterface from '../components/ResultsInterface'; // <-- Import

function LobbyPage() {
  const { roomId } = useParams();
  const location = useLocation();
  const { nickname } = location.state || { nickname: 'Guest' };

  // This state now holds the entire room object from the server
  const [room, setRoom] = useState(null); 
  const [isHost, setIsHost] = useState(false);
  const [isAI, setIsAI] = useState(false);
  const [results, setResults] = useState(null);

  useEffect(() => {
    // --- Event Handlers ---
    const handleRoomUpdate = (updatedRoom) => {
      console.log('Received room update:', updatedRoom);
      const uniquePlayers = Array.from(new Map(updatedRoom.players.map(player => [player.socketId, player])).values());
      updatedRoom.players = uniquePlayers;
      setRoom(updatedRoom);
      if (socket.id === updatedRoom.hostId) setIsHost(true);
      if (updatedRoom.gameState === 'lobby') {
        setResults(null);
      }
    };

    // const handleGameStarted = (roomData) => {
    //   console.log('Game is starting!', roomData);
    //   if (socket.id === roomData.aiPlayerSocketId) setIsAI(true);
    //   setRoom(roomData); // The room data now contains the 'playing' state
    // };
    // --- THIS FUNCTION IS NOW FIXED ---
    const handleGameStarted = (roomData) => {
      console.log('Game is starting!', roomData);
      // Add the same de-duplication logic here
      const uniquePlayers = Array.from(new Map(roomData.players.map(player => [player.socketId, player])).values());
      roomData.players = uniquePlayers;

      if (socket.id === roomData.aiPlayerSocketId) {
        setIsAI(true);
      }
      setRoom(roomData);
    };
    
    // --- NEW: Handlers for Voting and Results ---
    const handleStartVoting = () => {
      console.log('Voting is starting!');
      // We just need to update the gameState
      setRoom(prevRoom => ({ ...prevRoom, gameState: 'voting' }));
    };

    const handleGameFinished = (resultsData) => {
      console.log('Game has finished!', resultsData);
      setResults(resultsData);
      // Store the results and update the state to 'finished'
      setRoom(prevRoom => ({ ...prevRoom, gameState: 'finished', results: resultsData }));
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
    socket.on('startVoting', handleStartVoting); // <-- Listen
    socket.on('gameFinished', handleGameFinished); // <-- Listen

    return () => {
      socket.off('connect', joinRoomOnConnect);
      socket.off('roomUpdate', handleRoomUpdate);
      socket.off('gameStarted', handleGameStarted);
      socket.off('startVoting', handleStartVoting); // <-- Cleanup
      socket.off('gameFinished', handleGameFinished); // <-- Cleanup
    };
  }, [roomId, nickname]);

  const handleStartGame = () => {
    socket.emit('startGame', { roomId });
  };
  
  // --- RENDER LOGIC ---
  if (!room) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  // Based on the gameState from the server, render the correct component
  switch (room.gameState) {
    case 'playing':
      return <GameInterface gameData={room} roomId={roomId} isAI={isAI} />;
    case 'voting':
      return <VotingInterface gameData={room} roomId={roomId} isAI={isAI} />;
    case 'finished':
      return <ResultsInterface results={room.results} isHost={isHost} roomId={roomId} players={room.players} />;
    case 'lobby':
    default:
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md text-center">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Lobby</h1>
            <p className="text-gray-600 mb-4">
              Share Code: <strong className="text-blue-600 tracking-widest">{roomId}</strong>
            </p>
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