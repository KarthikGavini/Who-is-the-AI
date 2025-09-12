import React from 'react';
import { motion } from 'framer-motion';

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

export default LoadingScreen;