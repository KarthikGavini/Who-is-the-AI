// src/components/GameInterface.jsx
import React, { useState, useEffect, useRef } from 'react';
import { socket } from '../socket'; // Use our shared socket instance

function GameInterface({ gameData, roomId, isAI }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const chatLogRef = useRef(null);

  // --- Real-time Chat Logic ---
  useEffect(() => {
    // Listener for incoming messages
    const handleNewMessage = (message) => {
      setMessages((prevMessages) => [...prevMessages, message]);
    };

    socket.on('newMessage', handleNewMessage);

    // Clean up the listener when the component unmounts
    return () => {
      socket.off('newMessage', handleNewMessage);
    };
  }, []); // Empty dependency array means this effect runs only once

  // --- Auto-scrolling Logic ---
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages]); // Run this effect every time the messages array changes

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || isAI) return;

    // Emit the message to the server
    socket.emit('sendMessage', { roomId, messageText: newMessage });

    // Clear the input field
    setNewMessage('');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* --- ADD THE "YOU ARE THE AI" BANNER --- */}
      {isAI && (
        <div className="p-3 text-center bg-red-600 text-white font-bold">
          You are the AI Impostor. The AI will speak for you.
        </div>
      )}
      <div className="border-b p-4 text-center bg-white shadow-sm">
        <p className="text-sm text-gray-500 uppercase tracking-wider">Theme</p>
        <h2 className="text-2xl font-bold text-gray-800">{gameData.currentTheme}</h2>
      </div>
      <div className="border-b p-4 text-center bg-gray-50">
        <p className="text-sm text-gray-500 uppercase tracking-wider">Question</p>
        <h3 className="text-lg font-semibold text-gray-700">{gameData.currentQuestion}</h3>
      </div>
      
      {/* Chat Log */}
      <div ref={chatLogRef} className="flex-grow p-4 overflow-y-auto">
        <div className="flex flex-col space-y-4">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex items-end gap-2 ${
                msg.socketId === socket.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`rounded-lg p-3 max-w-xs break-words shadow ${
                  msg.socketId === socket.id
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-white text-gray-800 rounded-bl-none'
                }`}
              >
                <p className="font-bold text-sm">{msg.nickname}</p>
                <p>{msg.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Message Input Form */}
      <div className="p-4 bg-white border-t">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={isAI ? "The AI is thinking..." : "Type your message..."}
            disabled={isAI}
            className="flex-grow p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isAI}
            className="bg-blue-500 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-600"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

export default GameInterface;