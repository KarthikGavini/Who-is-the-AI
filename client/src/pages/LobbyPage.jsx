import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../socket';
import GameInterface from '../components/GameInterface';
import VotingInterface from '../components/VotingInterface';
import ResultsInterface from '../components/ResultsInterface';
import toast from 'react-hot-toast';

// --- Reusable UI Components ---

const PlayerCard = ({ nickname, isHost }) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ duration: 0.3 }}
        className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-gray-700"
    >
        <div className="flex items-center">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-sm font-bold">
                {nickname.charAt(0).toUpperCase()}
            </span>
            <span className="ml-3 font-medium text-white">{nickname}</span>
        </div>
        {isHost && <span className="text-yellow-400 text-xl" title="Host">👑</span>}
    </motion.div>
);

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
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="gameDuration" className="block text-sm font-medium text-gray-300 mb-2">Game Duration</label>
                    <select id="gameDuration" name="gameDuration" value={room.gameDuration} onChange={handleSettingsChange} className="w-full p-3 bg-gray-900/70 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
                        <option value="10">10 sec</option>
                        <option value="60">1 min</option>
                        <option value="120">2 min</option>
                        <option value="180">3 min</option>
                        <option value="240">4 min</option>
                        <option value="300">5 min</option>
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


const LoadingScreen = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#05040a] to-[#0c1636] text-white">
        <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-t-blue-500 border-gray-700 rounded-full mb-4"
        ></motion.div>
        <h1 className="text-2xl font-bold">Connecting to Lobby...</h1>
    </div>
);


function LobbyPage() {
    const { roomId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const errorHandled = useRef(false);
    const { nickname, hasJoined } = location.state || { nickname: 'Guest', hasJoined: false };

    const [room, setRoom] = useState(null);
    const [isHost, setIsHost] = useState(false);
    const [copied, setCopied] = useState(false);
    
    const handleSettingsChange = (e) => {
        const { name, value } = e.target;
        socket.emit('updateGameSettings', {
            roomId,
            [name]: parseInt(value, 10),
        });
    };

    const formatDuration = (seconds) => {
        if (seconds < 60) return `${seconds} seconds`;
        const minutes = seconds / 60;
        return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    };

    const handleLobbyTypeChange = () => {
        if (!isHost || !room) return; // Safety check
        socket.emit('updateLobbyType', {
            roomId,
            isPublic: !room.isPublic,
        });
    };

    useEffect(() => {

        const handleBeforeUnload = (event) => {
            event.preventDefault();
            event.returnValue = 'Are you sure you want to leave? Your game progress will be lost.';
        };
        window.addEventListener('beforeunload', handleBeforeUnload);

        const handleRoomUpdate = (updatedRoom) => {
            const uniquePlayers = Array.from(new Map(updatedRoom.players.map(player => [player.socketId, player])).values());
            updatedRoom.players = uniquePlayers;

            setRoom(prevRoom => {
                if (prevRoom && prevRoom.gameState === 'finished' && updatedRoom.gameState === 'finished') {
                    return { ...prevRoom, ...updatedRoom };
                }
                return updatedRoom;
            });
            setIsHost(socket.id === updatedRoom.hostId);
        };

        const handleGameStarted = (roomData) => {
            setRoom(roomData);
        };

        const handleStartVoting = () => {
            setRoom(prevRoom => ({ ...prevRoom, gameState: 'voting' }));
        };

        const handleGameFinished = (resultsData) => {
            setRoom(prevRoom => ({ ...prevRoom, gameState: 'finished', results: resultsData }));
        };

        const handleError = (errorMessage) => {
            if (errorHandled.current) return;
            errorHandled.current = true;
            // alert(`Could not join room: ${errorMessage}`);
            toast.error(`Could not join room: ${errorMessage}`);
            navigate('/');
        };

        socket.on('roomUpdate', handleRoomUpdate);
        socket.on('gameStarted', handleGameStarted);
        socket.on('startVoting', handleStartVoting);
        socket.on('gameFinished', handleGameFinished);
        socket.on('error', handleError);

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
    }, [roomId, nickname, navigate, hasJoined]);

    const handleStartGame = () => {
        socket.emit('startGame', { roomId });
    };

    const handleQuitLobby = () => {
        socket.emit('leaveRoom', { roomId });
        navigate('/');
    };
    
    const handleCopyCode = () => {
        navigator.clipboard.writeText(roomId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!room) {
        return <LoadingScreen />;
    }

    switch (room.gameState) {
        case 'playing':
            return <GameInterface gameData={room} roomId={roomId} />;
        case 'voting':
            return <VotingInterface gameData={room} roomId={roomId} />;
        case 'finished':
            return room.results ? <ResultsInterface results={room.results} roomId={roomId} /> : <LoadingScreen />;
        case 'lobby':
        default:
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
    }
}

export default LobbyPage;

