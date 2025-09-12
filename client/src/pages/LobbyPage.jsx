import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../socket';

import GameInterface from '../components/GameInterface';
import VotingInterface from '../components/VotingInterface';
import ResultsInterface from '../components/ResultsInterface';
import LoadingScreen from '../components/ui/LoadingScreen';
import LobbyView from '../components/lobby/LobbyView';
import toast from 'react-hot-toast';

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
            return (
                <LobbyView
                    room={room}
                    isHost={isHost}
                    copied={copied}
                    handleQuitLobby={handleQuitLobby}
                    handleCopyCode={handleCopyCode}
                    handleStartGame={handleStartGame}
                    handleSettingsChange={handleSettingsChange}
                    formatDuration={formatDuration}
                    handleLobbyTypeChange={handleLobbyTypeChange}
                    roomId={roomId} 
                />
            );
    }
}

export default LobbyPage;