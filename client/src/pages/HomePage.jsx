import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

// A reusable Modal component
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm" onClick={onClose}></div>
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="relative bg-gray-900/90 rounded-xl shadow-2xl w-full max-w-md text-left border border-gray-700"
            >
                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold text-white">{title}</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                        </button>
                    </div>
                    {children}
                </div>
            </motion.div>
        </div>
    );
};

// Custom AI cursor that follows the mouse
const AiFollower = () => {
    const followerRef = useRef(null);
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (followerRef.current) {
                followerRef.current.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
            }
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div ref={followerRef} className="fixed top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-blue-500/50 backdrop-blur-sm border-2 border-blue-400 shadow-lg shadow-blue-500/50 transition-transform duration-300 ease-out pointer-events-none z-[999] hidden md:block">
            <div className="w-full h-full flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
            </div>
        </div>
    );
};

// Smaller, interactive AI Mascot
const AiMascot = () => {
    const [pos, setPos] = useState({ top: '70%', left: '12%' });
    const [visibleTip, setVisibleTip] = useState('');

    useEffect(() => {
        let mounted = true;

        const behaviors = [
            () => { if (!mounted) return; setPos({ top: '30%', left: '70%' }); },
            () => { if (!mounted) return; setPos({ top: '20%', left: '20%' }); },
            () => { if (!mounted) return; setPos({ top: '85%', left: '80%' }); },
            () => { if (!mounted) return; setPos({ top: '55%', left: '50%' }); },
        ];
        const interval = setInterval(() => {
            behaviors[Math.floor(Math.random() * behaviors.length)]();
        }, 6000);

        return () => { mounted = false; clearInterval(interval); };
    }, []);

    return (
        <>
            <motion.div
                onMouseEnter={() => setVisibleTip('Oooh! That tickles 😵')}
                onMouseLeave={() => setVisibleTip('')}
                animate={{ top: pos.top, left: pos.left, rotate: [0, 6, -6, 0] }}
                transition={{ duration: 1.6, ease: 'easeInOut' }}
                className="fixed w-12 h-12 z-40 flex items-center justify-center"
            >
                <motion.div
                    initial={{ scale: 0.95 }}
                    animate={{ scale: [1, 1.06, 0.98, 1] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="relative w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 via-purple-500 to-indigo-600 shadow-[0_12px_40px_rgba(99,102,241,0.28)] border-2 border-white/25 flex items-center justify-center"
                >
                    <div className="absolute -top-3 w-8 h-8 rounded-full bg-white/95 flex items-center justify-center border border-gray-200 shadow-sm">
                        <div className="w-8 h-4 flex items-center justify-evenly">
                            <div className="w-2 h-2 bg-black rounded-full" />
                            <div className="w-2 h-2 bg-black rounded-full" />
                        </div>
                    </div>
                    <div className="absolute bottom-1 w-8 text-center text-white/95 text-xs font-semibold">\_(ツ)_/</div>
                </motion.div>

                {visibleTip && (
                    <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute -bottom-10 whitespace-nowrap px-3 py-2 rounded-md bg-black/80 border border-white/10 text-white text-sm shadow-lg"
                    >
                        {visibleTip}
                    </motion.div>
                )}
            </motion.div>
        </>
    );
};


const InfoCard = ({ icon, title, children }) => (
    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 backdrop-blur-sm h-full">
        <div className="flex items-center mb-3">
            {icon}
            <h4 className="font-bold text-lg text-white ml-3">{title}</h4>
        </div>
        <p className="text-gray-400">{children}</p>
    </div>
);


function HomePage() {
    const [nickname, setNickname] = useState('');
    const [roomCode, setRoomCode] = useState('');
    const [activeModal, setActiveModal] = useState(null);
    const navigate = useNavigate();
    // --- NEW: Add loading state ---
    const [isLoading, setIsLoading] = useState(false);


    const handleCreateGame = async (e) => {
        e.preventDefault();
        if (!nickname.trim()) return;
        try {
            const response = await axios.post('http://localhost:5002/api/rooms/create');
            const { roomId } = response.data;
            console.log('Room ID:', roomId);
            navigate(`/game/${roomId}`, { state: { nickname, hasJoined: true } });
        } catch (error) {
            console.error('Error creating game:', error);
            alert('Could not create game. Please try again.');
        }
    };

    const handleJoinGameWithCode = (e) => {
        e.preventDefault();
        if (!nickname.trim() || !roomCode.trim()) return;
        navigate(`/game/${roomCode}`, { state: { nickname, hasJoined: true } });
    };

    const handleJoinPublicGame = async (e) => {
        e.preventDefault();
        if (!nickname.trim()) return;

        setIsLoading(true); 
        try {
            const response = await axios.post('http://localhost:5002/api/rooms/find-public');
            const { roomId, created } = response.data;

            if (created) {
                toast.success('No public lobbies found. A new one was created!');
            }
            navigate(`/game/${roomId}`, { state: { nickname, hasJoined: true } });

        } catch (error) {
            console.error('Error finding public game:', error);
            toast.error('Could not find a public game. Please try again.');
        } finally {
            setIsLoading(false); 
            setActiveModal(null); 
        }
    };

    const renderModalContent = () => {
        // This function remains unchanged
        switch (activeModal) {
            case 'create':
                return (
                    <form onSubmit={handleCreateGame}>
                        <label htmlFor="nickname-create" className="block text-left font-semibold text-gray-300 mb-2">Enter Your Nickname</label>
                        <input id="nickname-create" type="text" placeholder="e.g., Captain" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength="15" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow" required />
                        <button type="submit" className="w-full mt-6 p-3 rounded-md text-white font-bold bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">Create Private Game</button>
                    </form>
                );
            case 'join-code':
                return (
                    <form onSubmit={handleJoinGameWithCode} className="space-y-4">
                        <div>
                            <label htmlFor="nickname-join" className="block text-left font-semibold text-gray-300 mb-2">Enter Your Nickname</label>
                            <input id="nickname-join" type="text" placeholder="e.g., Detective" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength="15" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow" required />
                        </div>
                        <div>
                            <label htmlFor="roomCode" className="block text-left font-semibold text-gray-300 mb-2">Enter Game Code</label>
                            <input
                                id="roomCode"
                                type="text"
                                placeholder="e.g., A4B1"
                                value={roomCode}
                                onChange={(e) => setRoomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                maxLength="4" 
                                className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow"
                                required
                            />
                        </div>
                        <button type="submit" className="w-full pt-4 p-3 rounded-md text-white font-bold bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors">Join with Code</button>
                    </form>
                );
            case 'join-public':
                return (
                    <form onSubmit={handleJoinPublicGame}>
                        <label htmlFor="nickname-public" className="block text-left font-semibold text-gray-300 mb-2">Enter Your Nickname</label>
                        <input id="nickname-public" type="text" placeholder="e.g., Maverick" value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength="15" className="w-full p-3 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow" required />
                        <button
                            type="submit"
                            className="w-full mt-6 p-3 rounded-md text-white font-bold bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Finding Game...' : 'Find Public Game'}
                        </button>
                    </form>
                );
            default:
                return null;
        }
    };

    const openModal = (modalType) => {
        setNickname('');
        setRoomCode('');
        setActiveModal(modalType);
    };

    return (
        <div className="bg-gradient-to-b from-[#05040a] to-[#0c1636] text-gray-200 min-h-screen font-sans overflow-x-hidden">
            <AiMascot />

            <header className="py-4 px-4 md:px-6 absolute top-0 left-0 w-full">
                <div className="container mx-auto flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-wider text-white">AI IMPOSTOR</h1>
                        <p className="text-xs text-gray-500">Made by Karthik Gavini</p>
                    </div>
                    <div className="text-sm text-gray-400">v1.0 • Beta</div>
                </div>
            </header>

            <main className="container mx-auto px-4 pt-24 pb-16 text-center">
                <div className="mb-20">
                    <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white mb-4">Who is the AI?</h2>
                    <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto">A social deduction game where you chat, investigate, and vote to find the secret AI hiding in your group.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
                    <div onClick={() => openModal('create')} className="bg-gray-800 p-10 rounded-xl shadow-lg border border-gray-700 hover:border-blue-500 hover:scale-105 transform transition-all duration-300 cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-blue-500"><path d="M5 12h14" /><path d="M12 5v14" /></svg>
                        <h3 className="text-2xl font-bold mb-2 text-white">Create Game</h3>
                        <p className="text-gray-400">Start a new private lobby and invite your friends.</p>
                    </div>
                    <div onClick={() => openModal('join-code')} className="bg-gray-800 p-10 rounded-xl shadow-lg border border-gray-700 hover:border-green-500 hover:scale-105 transform transition-all duration-300 cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-green-500"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72" /></svg>
                        <h3 className="text-2xl font-bold mb-2 text-white">Join with Code</h3>
                        <p className="text-gray-400">Enter a lobby code to join a friend's private game.</p>
                    </div>
                    <div onClick={() => openModal('join-public')} className="bg-gray-800 p-10 rounded-xl shadow-lg border border-gray-700 hover:border-purple-500 hover:scale-105 transform transition-all duration-300 cursor-pointer">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 text-purple-500"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                        <h3 className="text-2xl font-bold mb-2 text-white">Join Public Game</h3>
                        <p className="text-gray-400">Jump into a game with other players right now.</p>
                    </div>

                </div>

                {/* --- NEW LOCATION FOR YOUR TEXT --- */}
                <div className="max-w-3xl italic mx-auto mb-16">
                    <p className="text-base text-blue-400">
                        Our AI learns from every match played by the community. Face an ever-evolving challenge.
                    </p>
                </div>



                <div className="max-w-6xl mx-auto">
                    <div className="p-8 rounded-2xl border border-blue-500/30 bg-blue-900/10 mb-16">
                        <h3 className="text-3xl font-bold text-white mb-8">How to Play</h3>
                        <div className="grid md:grid-cols-5 gap-6 text-left">
                            <InfoCard title="1. Join" icon={<span className="text-blue-400">🎮</span>}>Start or join a lobby.</InfoCard>
                            <InfoCard title="2. Role" icon={<span className="text-purple-400">🕵️</span>}>Get your secret role: Human or AI.</InfoCard>
                            <InfoCard title="3. Chat" icon={<span className="text-green-400">💬</span>}>Discuss the theme to find the impostor.</InfoCard>
                            <InfoCard title="4. Vote" icon={<span className="text-yellow-400">🗳️</span>}>Vote for who you think is the AI.</InfoCard>
                            <InfoCard title="5. Win" icon={<span className="text-red-400">🏆</span>}>Humans win by finding the AI. The AI wins by surviving.</InfoCard>
                        </div>
                    </div>

                    <div className="p-8 rounded-2xl border border-purple-500/30 bg-purple-900/10">
                        <h3 className="text-3xl font-bold text-white mb-8">The Rules</h3>
                        <div className="grid md:grid-cols-4 gap-6 text-left">
                            <InfoCard title="English Only" icon={<span className="text-gray-400">🗣️</span>}>All communication must be in English.</InfoCard>
                            <InfoCard title="Stay On Topic" icon={<span className="text-gray-400">🎯</span>}>Conversation must relate to the theme.</InfoCard>
                            <InfoCard title="No Meta-Gaming" icon={<span className="text-gray-400">🚫</span>}>Don't ask questions to "break" the AI.</InfoCard>
                            <InfoCard title="Be Respectful" icon={<span className="text-gray-400">🤝</span>}>No personal attacks. Keep it fun.</InfoCard>
                        </div>
                    </div>
                </div>

            </main>

            <Modal isOpen={!!activeModal} onClose={() => setActiveModal(null)} title={
                activeModal === 'create' ? 'Create a New Game' :
                    activeModal === 'join-code' ? 'Join with a Code' :
                        'Join a Public Game'
            }>
                {renderModalContent()}
            </Modal>
        </div>
    );
}

export default HomePage;