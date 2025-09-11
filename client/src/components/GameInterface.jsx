// // src/components/GameInterface.jsx
// import React, { useState, useEffect, useMemo } from 'react';
// import { socket } from '../socket';

// function GameInterface({ gameData, roomId }) {
//   const [messageText, setMessageText] = useState('');
//   const [messages, setMessages] = useState(gameData.messages || []);

//   // Convert the anonymousPlayers object from the server into a real Map for easy lookups.
//   // We use useMemo to prevent this from being recalculated on every render.
//   const anonymousPlayersMap = useMemo(() => 
//     new Map(Object.entries(gameData.anonymousPlayers || {})), 
//     [gameData.anonymousPlayers]
//   );

//   // Find the current user's anonymous name (e.g., "Player 3").
//   const myAnonymousName = anonymousPlayersMap.get(socket.id);

//   useEffect(() => {
//     const handleNewMessage = (newMessage) => {
//       setMessages(prevMessages => [...prevMessages, newMessage]);
//     };

//     socket.on('newMessage', handleNewMessage);

//     return () => {
//       socket.off('newMessage', handleNewMessage);
//     };
//   }, []);

//   const handleSendMessage = (e) => {
//     e.preventDefault();
//     if (messageText.trim()) {
//       socket.emit('sendMessage', { roomId, messageText });
//       setMessageText('');
//     }
//   };

//   return (
//     <div className="flex flex-col h-screen bg-gray-100 p-4">
//       <div className="bg-white p-4 rounded-xl shadow-lg flex-grow flex flex-col">
//         {/* Header */}
//         <div className="border-b pb-4 mb-4 text-center">
//           <h1 className="text-2xl font-bold text-gray-800">Theme: {gameData.currentTheme}</h1>
//           <p className="text-gray-600 mt-1">"{gameData.currentQuestion}"</p>
//           <div className="mt-2 p-2 bg-blue-100 text-blue-800 font-bold rounded-md">
//             You are: {myAnonymousName}
//           </div>
//         </div>

//         {/* Chat Messages */}
//         <div className="flex-grow overflow-y-auto mb-4 pr-2">
//           <ul className="space-y-4">
//             {messages.map((msg, index) => {
//               // Look up the sender's anonymous name using the map.
//               const senderName = anonymousPlayersMap.get(msg.socketId);
//               // Check if the message is from the current player to align it right.
//               const isMyMessage = msg.socketId === socket.id;

//               return (
//                 <li key={index} className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'}`}>
//                   <div className={`py-2 px-4 rounded-xl max-w-lg ${isMyMessage ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'}`}>
//                     <span className="font-bold block text-sm">{senderName}</span>
//                     <p>{msg.text}</p>
//                   </div>
//                 </li>
//               );
//             })}
//           </ul>
//         </div>

//         {/* Message Input Form */}
//         <form onSubmit={handleSendMessage} className="flex space-x-2">
//           <input
//             type="text"
//             value={messageText}
//             onChange={(e) => setMessageText(e.target.value)}
//             placeholder="Type your message..."
//             className="flex-grow p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
//           />
//           <button
//             type="submit"
//             className="p-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
//           >
//             Send
//           </button>
//         </form>
//       </div>
//     </div>
//   );
// }

// export default GameInterface;


import React, { useState, useEffect, useMemo, useRef } from 'react';
import { socket } from '../socket';
import { motion, AnimatePresence } from 'framer-motion';

// Color Palette for Players
const playerColors = [
    'text-red-400', 'text-cyan-400', 'text-green-400', 'text-yellow-400', 'text-pink-400', 'text-indigo-400'
];

// Helper to format time
const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

function GameInterface({ gameData, roomId }) {
    const [messageText, setMessageText] = useState('');
    const [messages, setMessages] = useState(gameData.messages || []);
    const chatEndRef = useRef(null);

    const gameEndTime = useMemo(() => {
        const startTime = new Date(gameData.gameStartTime).getTime();
        return startTime + (gameData.gameDuration * 1000);
    }, [gameData.gameStartTime, gameData.gameDuration]);

    const [timeRemaining, setTimeRemaining] = useState(() => {
        const remaining = Math.floor((gameEndTime - Date.now()) / 1000);
        return Math.max(0, remaining);
    });

    const anonymousPlayersMap = useMemo(() =>
        new Map(Object.entries(gameData.anonymousPlayers || {})),
        [gameData.anonymousPlayers]
    );

    const playerColorMap = useMemo(() => {
        const map = new Map();
        let colorIndex = 0;
        for (const [id] of anonymousPlayersMap.entries()) {
            map.set(id, playerColors[colorIndex % playerColors.length]);
            colorIndex++;
        }
        return map;
    }, [anonymousPlayersMap]);

    const myAnonymousName = anonymousPlayersMap.get(socket.id);
    const isAI = gameData.aiPlayerSocketId === socket.id;

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    useEffect(() => {
        const handleNewMessage = (newMessage) => {
            setMessages(prevMessages => [...prevMessages, newMessage]);
        };
        socket.on('newMessage', handleNewMessage);
        return () => {
            socket.off('newMessage', handleNewMessage);
        };
    }, []);

    useEffect(() => {
        if (isNaN(gameEndTime)) return;
        const timerInterval = setInterval(() => {
            const secondsLeft = Math.floor((gameEndTime - Date.now()) / 1000);
            setTimeRemaining(Math.max(0, secondsLeft));
        }, 1000);
        return () => clearInterval(timerInterval);
    }, [gameEndTime]);

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (messageText.trim()) {
            socket.emit('sendMessage', { roomId, messageText });
            setMessageText('');
        }
    };

    return (
        <div className="flex h-screen bg-gradient-to-b from-[#05040a] to-[#0c1636] text-gray-200 font-sans">

            <aside className="hidden lg:flex flex-col w-72 bg-gray-900/50 p-4 border-r border-gray-700">
                <h2 className="text-xl font-bold mb-4 text-white">Players</h2>
                <div className="space-y-3">
                    {Array.from(anonymousPlayersMap.entries()).map(([id, name]) => {
                        const colorClass = playerColorMap.get(id) || 'text-gray-400';
                        return (
                            <div key={id} className={`p-3 rounded-lg flex items-center transition-colors ${id === socket.id ? 'bg-blue-500/20' : 'bg-gray-800/60'}`}>
                                <span className={`w-3 h-3 rounded-full mr-3 ${id === socket.id ? 'bg-blue-400' : 'bg-gray-500'}`}></span>
                                <span className={`font-medium ${colorClass}`}>{name}</span>
                            </div>
                        );
                    })}
                </div>
                <div className="mt-auto text-center p-3 bg-gray-800 rounded-lg border border-gray-700">
                    <p className="font-bold text-lg text-white">You are: {myAnonymousName}</p>
                    {isAI && <p className="text-red-400 font-semibold">(You are the AI)</p>}
                </div>
            </aside>

            <main className="flex-1 flex flex-col min-w-0"> {/* Added min-w-0 to prevent content overflow */}
                {/* CORRECTED HEADER */}
                <header className="bg-gray-900/50 p-4 border-b border-gray-700 backdrop-blur-sm flex justify-center">
                    <div className="grid grid-cols-3 items-center w-full max-w-3xl text-center gap-4">
                        {/* Left */}
                        <div>
                            <p className="text-sm text-gray-400">Theme</p>
                            <h1 className="text-lg md:text-xl font-bold text-white">
                                {gameData.currentTheme}
                            </h1>
                        </div>

                        {/* Center */}
                        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50">
                            <p className="text-sm text-red-300">Time Remaining</p>
                            <p className="text-xl md:text-2xl font-black text-white tracking-wider">
                                {formatTime(timeRemaining)}
                            </p>
                        </div>

                        {/* Right */}
                        <div>
                            <p className="text-sm text-gray-400">Question</p>
                            <h2 className="text-base md:text-lg text-gray-300 italic">
                                "{gameData.currentQuestion}"
                            </h2>
                        </div>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-2 sm:p-4 md:p-6">
                    <div className="max-w-3xl mx-auto">
                        <ul className="space-y-4">
                            <AnimatePresence>
                                {messages.map((msg, index) => {
                                    const isMyMessage = msg.socketId === socket.id;
                                    const colorClass = playerColorMap.get(msg.socketId) || 'text-gray-200';
                                    return (
                                        <motion.li
                                            key={index}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`flex flex-col ${isMyMessage ? 'items-end' : 'items-start'}`}
                                        >
                                            <div className={`py-2 px-4 rounded-2xl max-w-lg ${isMyMessage ? 'bg-blue-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                                                <span className={`font-bold block text-sm ${isMyMessage ? 'text-blue-200' : colorClass}`}>{msg.nickname}</span>
                                                <p className="text-base break-words">{msg.text}</p>
                                            </div>
                                        </motion.li>
                                    );
                                })}
                            </AnimatePresence>
                            <div ref={chatEndRef} />
                        </ul>
                    </div>
                </div>

                <footer className="p-2 sm:p-4 bg-gray-900/50 border-t border-gray-700">
                    <div className="max-w-3xl mx-auto">
                        <form onSubmit={handleSendMessage} className="flex space-x-2 sm:space-x-3">
                            <input
                                type="text"
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                placeholder="Type your message..."
                                className="flex-grow p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                                autoFocus
                            />
                            <button type="submit" className="px-4 sm:px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-600" disabled={!messageText.trim()}>
                                Send
                            </button>
                        </form>
                    </div>
                </footer>
            </main>
        </div>
    );
}

export default GameInterface;

