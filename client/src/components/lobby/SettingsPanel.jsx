import React from 'react';

const SettingsPanel = ({ isHost, room, handleSettingsChange, formatDuration, handleLobbyTypeChange }) => (
  <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 backdrop-blur-sm h-full">
    <h2 className="text-2xl font-bold text-white mb-6">Game Settings</h2>

    <div className="mb-6">
      <label className="block text-sm font-medium text-gray-300 mb-2">Lobby Type</label>
      {/* The entire toggle container is now updated */}
      <div
        className={`flex items-center justify-between p-3 rounded-lg bg-gray-900/50 border border-gray-700 ${isHost ? 'cursor-pointer' : 'cursor-not-allowed'}`}
        onClick={isHost ? handleLobbyTypeChange : null} // Only host can click
      >
        <span className={`font-medium transition-colors ${room.isPublic ? 'text-green-400' : 'text-white'}`}>
          {room.isPublic ? 'Public' : 'Private'}
        </span>
        <div className="relative inline-flex items-center">
          {/* The background of the toggle changes based on state */}
          <div className={`w-11 h-6 rounded-full transition-colors ${room.isPublic ? 'bg-green-500' : 'bg-gray-600'}`}></div>
          {/* The dot's position changes based on state */}
          <div className={`dot absolute top-1 bg-white w-4 h-4 rounded-full transition-transform ${room.isPublic ? 'translate-x-5' : 'translate-x-1'}`}></div>
          {!isHost && <span className="absolute top-full left-1/2 -translate-x-1/2 mt-1 text-xs text-gray-500 whitespace-nowrap">Host only</span>}
        </div>
      </div>
    </div>

    {isHost ? (
      <div className="space-y-4">
        <div>
          <label htmlFor="maxPlayers" className="block text-sm font-medium text-gray-300 mb-2">Max Players</label>
          <select id="maxPlayers" name="maxPlayers" value={room.maxPlayers} onChange={handleSettingsChange} className="w-full p-3 bg-gray-900/70 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>
        <div>
          <label htmlFor="gameDuration" className="block text-sm font-medium text-gray-300 mb-2">Game Duration</label>
          <select id="gameDuration" name="gameDuration" value={room.gameDuration} onChange={handleSettingsChange} className="w-full p-3 bg-gray-900/70 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
            {/* <option value="10">10 sec</option>
            <option value="60">1 min</option> */}
            <option value="180">3 min</option>
            <option value="300">5 min</option>
            <option value="420">7 min</option>
            <option value="600">10 min</option>
          </select>
        </div>
      </div>
    ) : (
      <div className="space-y-3 text-gray-300">
        <div className="flex justify-between"><span>Max Players:</span> <strong className="text-white">{room.maxPlayers}</strong></div>
        <div className="flex justify-between"><span>Game Duration:</span> <strong className="text-white">{formatDuration(room.gameDuration)}</strong></div>
      </div>
    )}
  </div>
);

export default SettingsPanel;