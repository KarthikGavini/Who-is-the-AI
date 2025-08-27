// src/pages/HomePage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function HomePage() {
  const [nickname, setNickname] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const navigate = useNavigate();

  const handleCreateGame = async () => {
    if (!nickname.trim()) return;
    try {
      const response = await axios.post('http://localhost:5002/api/rooms/create');
      const { roomId } = response.data;
      navigate(`/game/${roomId}`, { state: { nickname } });
    } catch (error) {
      console.error('Error creating game:', error);
      alert('Could not create game. Please try again.');
    }
  };

  // --- THIS FUNCTION IS NOW UPDATED ---
  const handleJoinGame = () => {
    if (!nickname.trim() || !roomCode.trim()) return;
    // Navigate to the lobby with the provided code and nickname
    navigate(`/game/${roomCode}`, { state: { nickname } });
  };

  return (
    // ... the rest of the JSX remains the same
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">
          AI Impostor
        </h1>

        <div className="w-full mb-4">
          <label htmlFor="nickname" className="block text-left font-semibold text-gray-700 mb-2">
            Enter Your Nickname
          </label>
          <input
            id="nickname"
            type="text"
            placeholder="e.g., Player1"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          />
        </div>

        <div className="w-full flex flex-col gap-3">
          <button
            onClick={handleCreateGame}
            disabled={!nickname.trim()}
            className="w-full p-3 rounded-md text-white font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Create Game
          </button>
          
          <div className="flex items-center w-full my-2">
            <hr className="flex-grow border-t border-gray-300" />
            <span className="px-2 text-gray-500">OR</span>
            <hr className="flex-grow border-t border-gray-300" />
          </div>

          <div className="w-full">
            <label htmlFor="roomCode" className="block text-left font-semibold text-gray-700 mb-2">
              Enter Game Code
            </label>
            <input
              id="roomCode"
              type="text"
              placeholder="e.g., A4B1"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
          </div>
          <button
            onClick={handleJoinGame}
            disabled={!nickname.trim() || !roomCode.trim()}
            className="w-full p-3 rounded-md text-white font-bold bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Join Game
          </button>
        </div>
      </div>
    </div>
  );
}

export default HomePage;