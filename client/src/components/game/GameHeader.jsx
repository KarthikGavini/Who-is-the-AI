import React from 'react';
import { formatTime } from '../../utils/time'; // Import from our new utils file

const GameHeader = ({ theme, question, timeRemaining }) => (
    <header className="bg-gray-900/50 p-4 border-b border-gray-700 backdrop-blur-sm flex justify-center">
        <div className="grid grid-cols-3 items-center w-full max-w-3xl text-center gap-4">
            <div>
                <p className="text-sm text-gray-400">Theme</p>
                <h1 className="text-lg md:text-xl font-bold text-white">{theme}</h1>
            </div>
            <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50">
                <p className="text-sm text-red-300">Time Remaining</p>
                <p className="text-xl md:text-2xl font-black text-white tracking-wider">{formatTime(timeRemaining)}</p>
            </div>
            <div>
                <p className="text-sm text-gray-400">Question</p>
                <h2 className="text-base md:text-lg text-gray-300 italic">"{question}"</h2>
            </div>
        </div>
    </header>
);

export default GameHeader;