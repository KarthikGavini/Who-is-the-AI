import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import PlayerCard from './PlayerCard';
import SettingsPanel from './SettingsPanel';

const LobbyView = ({ room, isHost, copied, handleQuitLobby, handleCopyCode, handleStartGame, handleSettingsChange, formatDuration, handleLobbyTypeChange, roomId }) => {
  const lobbyStatusText = room.players.length < 2 ? 'Waiting for at least 2 players...' : 'Waiting for host to start...';

  return (
    <div className="bg-gradient-to-b from-[#05040a] to-[#0c1636] text-gray-200 min-h-screen font-sans p-4 md:p-8">
      <main className="container mx-auto">
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Lobby</h1>
            <p className="text-gray-400">Get your friends in here and get ready to play!</p>
          </div>
          <button onClick={handleQuitLobby} className="px-4 py-2 bg-red-600/80 text-white font-bold rounded-lg hover:bg-red-700 transition-colors">
            Quit
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
              <h2 className="text-lg font-semibold text-gray-300 mb-2">Share Room Code</h2>
              <div className="flex items-center space-x-4">
                <p className="text-3xl font-black tracking-widest text-white bg-gray-900/50 px-6 py-3 rounded-lg border border-gray-600">
                  {roomId}
                </p>
                <button onClick={handleCopyCode} className="px-5 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition w-28">
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-white">Players</h2>
                <span className="text-lg font-semibold text-gray-400">{room.players.length} / {room.maxPlayers}</span>
              </div>
              <div className="space-y-3">
                <AnimatePresence>
                  {room.players.map(player => (
                    <PlayerCard key={player.socketId} nickname={player.nickname} isHost={player.socketId === room.hostId} />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* <div className="lg:col-span-1">
                                        <SettingsPanel isHost={isHost} room={room} handleSettingsChange={handleSettingsChange} formatDuration={formatDuration} />
                                    </div> */}
          <div className="lg:col-span-1">
            {/* --- UPDATED: Pass the new handler to SettingsPanel --- */}
            <SettingsPanel
              isHost={isHost}
              room={room}
              handleSettingsChange={handleSettingsChange}
              formatDuration={formatDuration}
              handleLobbyTypeChange={handleLobbyTypeChange} // Pass the new function as a prop
            />
          </div>
        </div>

        <footer className="mt-8 text-center">
          {isHost ? (
            <button
              onClick={handleStartGame}
              disabled={room.players.length < 2}
              className="px-12 py-4 text-xl rounded-lg text-white font-bold bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 disabled:scale-100"
            >
              Start Game (players - {room.players.length})
            </button>
          ) : (
            <p className="text-lg font-semibold text-gray-300 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              {lobbyStatusText}
            </p>
          )}
        </footer>
      </main>
    </div>
  );
};

export default LobbyView;