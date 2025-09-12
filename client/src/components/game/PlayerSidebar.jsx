import React from 'react';
import { socket } from '../../socket'; // Note the updated path

const PlayerSidebar = ({ anonymousPlayersMap, playerColorMap, myAnonymousName, isAI }) => (
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
);

export default PlayerSidebar;