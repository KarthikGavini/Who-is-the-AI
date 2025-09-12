import React, { useEffect, useRef } from 'react';

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

export default AiFollower;