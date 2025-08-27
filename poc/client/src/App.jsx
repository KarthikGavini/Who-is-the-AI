// App.jsx (in the 'client/src' folder)
import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// --- SIMPLE BOT FOR PLAYER 2 ("Alex") ---
const getAlexResponse = () => {
  const responses = [
    "What do you guys think?",
    "I'm just trying to get a read on everyone.",
    "lol okay",
    "Not sure yet.",
    "Chloe seems kinda quiet.",
    "Player 1 is asking a lot of questions.",
    "Hmm, maybe.",
    "Yeah, that's a good point.",
  ];
  return responses[Math.floor(Math.random() * responses.length)];
};


function App() {
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const chatBoxRef = useRef(null);

  // Function to start a new game
  const startNewGame = async () => {
    try {
      await axios.post('http://localhost:5001/new-game');
      setHistory([]);
      setHistory([{ role: 'system', text: 'New 3-player game started. You are Player 1.' }]);
    } catch (error) {
      console.error("Error starting new game:", error);
    }
  };

  // Automatically scroll to the bottom of the chat box
  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [history]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || loading) return;

    setLoading(true);

    const userMessage = { role: 'user', text: message };
    // Add user's message to history immediately
    setHistory(prevHistory => [...prevHistory, userMessage]);
    setMessage('');

    // 1. Alex (Simple Bot) responds after a short delay
    setTimeout(async () => {
      const alexMessage = { role: 'bot', text: getAlexResponse() };
      setHistory(prevHistory => [...prevHistory, alexMessage]);

      // 2. Chloe (AI) responds after Alex
      try {
        // Construct the payload with the full conversation for context
        const conversationPayload = [...history, userMessage, alexMessage]
            .map(msg => `${msg.role}: ${msg.text}`)
            .join('\n');

        const response = await axios.post('http://localhost:5001/chat', {
          message: conversationPayload,
        });

        const chloeMessage = { role: 'ai', text: response.data.aiMessage };
        setHistory(prevHistory => [...prevHistory, chloeMessage]);

      } catch (error) {
        console.error("Error sending message:", error);
        const errorMessage = { role: 'ai', text: 'Oops! My connection timed out. Try again.' };
        setHistory(prevHistory => [...prevHistory, errorMessage]);
      } finally {
        setLoading(false);
      }
    }, 1500); // 1.5 second delay for Alex's response
  };

  const getPlayerName = (role) => {
    if (role === 'user') return 'You (P1)';
    if (role === 'bot') return 'Alex (P2)';
    if (role === 'ai') return 'Chloe (P3)';
    return '';
  };

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center font-sans p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl flex flex-col">
        <div className="flex justify-between items-center mb-4 border-b pb-3">
          <h1 className="text-2xl font-bold text-gray-800">AI Impostor PoC</h1>
          <button
            onClick={startNewGame}
            className="bg-red-500 text-white px-4 py-2 rounded-md font-semibold hover:bg-red-600 transition-colors"
          >
            New Game
          </button>
        </div>

        <div ref={chatBoxRef} className="h-96 overflow-y-auto border rounded-md p-4 mb-4 flex flex-col space-y-4">
          {history.map((msg, index) => (
            <div key={index} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
               {/* Avatars on the left for AI and Bot */}
              {(msg.role === 'ai' || msg.role === 'bot') && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${msg.role === 'ai' ? 'bg-gray-300' : 'bg-green-300'}`}>
                  {msg.role === 'ai' ? 'C' : 'A'}
                </div>
              )}

              <div className={`rounded-lg p-3 max-w-xs break-words ${
                  msg.role === 'user'
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : msg.role === 'ai'
                    ? 'bg-gray-200 text-gray-800 rounded-bl-none'
                    : msg.role === 'bot'
                    ? 'bg-green-200 text-green-900 rounded-bl-none'
                    : 'bg-yellow-200 text-yellow-800 text-center w-full' // System message
                }`}
              >
                {msg.role !== 'system' && <strong>{getPlayerName(msg.role)}: </strong>}
                {msg.text}
              </div>
              
               {/* Avatar on the right for User */}
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center font-bold text-white text-sm">
                  Y
                </div>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} className="flex space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your message..."
            disabled={loading}
            className="flex-grow p-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-3 rounded-md font-semibold hover:bg-blue-600 disabled:bg-gray-400 transition-colors"
          >
            {loading ? '...' : 'Send'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default App;