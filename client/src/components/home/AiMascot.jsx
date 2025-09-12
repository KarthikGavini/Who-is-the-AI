import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

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

export default AiMascot;