// src/components/GameInterface.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { socket } from '../socket';

function GameInterface({ gameData, roomId }) {
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState(gameData.messages || []);

  // Convert the anonymousPlayers object from the server into a real Map for easy lookups.
  // We use useMemo to prevent this from being recalculated on every render.
  const anonymousPlayersMap = useMemo(() => 
    new Map(Object.entries(gameData.anonymousPlayers || {})), 
    [gameData.anonymousPlayers]
  );
  
  // Find the current user's anonymous name (e.g., "Player 3").
  const myAnonymousName = anonymousPlayersMap.get(socket.id);

  useEffect(() => {
    const handleNewMessage = (newMessage) => {
      setMessages(prevMessages => [...prevMessages, newMessage]);
    };

    socket.on('newMessage', handleNewMessage);

    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (messageText.trim()) {
      socket.emit('sendMessage', { roomId, messageText });
      setMessageText('');
    }
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-100 p-4">
      <div className="bg-white p-4 rounded-xl shadow-lg flex-grow flex flex-col">
        {/* Header */}
        <div className="border-b pb-4 mb-4 text-center">
          <h1 className="text-2xl font-bold text-gray-800">Theme: {gameData.currentTheme}</h1>
          <p className="text-gray-600 mt-1">"{gameData.currentQuestion}"</p>
          <div className="mt-2 p-2 bg-blue-100 text-blue-800 font-bold rounded-md">
            You are: {myAnonymousName}
          </div>
        </div>

        {/* Chat Messages */}
        <div className="flex-grow overflow-y-auto mb-4 pr-2">
          <ul className="space-y-4">
            {messages.map((msg, index) => {
              // Look up the sender's anonymous name using the map.
              const senderName = anonymousPlayersMap.get(msg.socketId);
              // Check if the message is from the current player to align it right.
              const isMyMessage = msg.socketId === socket.id;
              
              return (
                <li key={index} className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'}`}>
                  <div className={`py-2 px-4 rounded-xl max-w-lg ${isMyMessage ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
                    <span className="font-bold block text-sm">{senderName}</span>
                    <p>{msg.text}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        
        {/* Message Input Form */}
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type your message..."
            className="flex-grow p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="p-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default GameInterface;