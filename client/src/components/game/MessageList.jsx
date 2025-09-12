import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { socket } from '../../socket';

const MessageList = ({ messages, playerColorMap, chatEndRef }) => (
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
);

export default MessageList;