import React, { useState, useEffect, useMemo, useRef } from 'react';
import { socket } from '../socket';
import { motion, AnimatePresence } from 'framer-motion';

// Import our new, smaller components
import PlayerSidebar from './game/PlayerSidebar';
import GameHeader from './game/GameHeader';
import MessageList from './game/MessageList';
import MessageInput from './game/MessageInput';

// Color Palette for Players
const playerColors = [
    'text-red-400', 'text-cyan-400', 'text-green-400', 'text-yellow-400', 'text-pink-400', 'text-indigo-400'
];

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
            <PlayerSidebar
                anonymousPlayersMap={anonymousPlayersMap}
                playerColorMap={playerColorMap}
                myAnonymousName={myAnonymousName}
                isAI={isAI}
            />
            <main className="flex-1 flex flex-col min-w-0">
                <GameHeader
                    theme={gameData.currentTheme}
                    question={gameData.currentQuestion}
                    timeRemaining={timeRemaining}
                />
                <MessageList
                    messages={messages}
                    playerColorMap={playerColorMap}
                    chatEndRef={chatEndRef}
                />
                <MessageInput
                    messageText={messageText}
                    onTextChange={(e) => setMessageText(e.target.value)}
                    onSendMessage={handleSendMessage}
                />
            </main>
        </div>
    );
}

export default GameInterface;

