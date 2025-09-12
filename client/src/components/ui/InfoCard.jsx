import React from 'react';

const InfoCard = ({ icon, title, children }) => (
    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 backdrop-blur-sm h-full">
        <div className="flex items-center mb-3">
            {icon}
            <h4 className="font-bold text-lg text-white ml-3">{title}</h4>
        </div>
        <p className="text-gray-400">{children}</p>
    </div>
);

export default InfoCard;