import React from 'react';
import { motion } from 'framer-motion';

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

export default PlayerCard;