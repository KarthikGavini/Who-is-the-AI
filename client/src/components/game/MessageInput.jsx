import React from 'react';

const MessageInput = ({ messageText, onTextChange, onSendMessage }) => (
    <footer className="p-2 sm:p-4 bg-gray-900/50 border-t border-gray-700">
        <div className="max-w-3xl mx-auto">
            <form onSubmit={onSendMessage} className="flex space-x-2 sm:space-x-3">
                <input
                    type="text"
                    value={messageText}
                    onChange={onTextChange}
                    placeholder="Type your message..."
                    className="flex-grow p-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    autoFocus
                />
                <button 
                    type="submit" 
                    className="px-4 sm:px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-600" 
                    disabled={!messageText.trim()}
                >
                    Send
                </button>
            </form>
        </div>
    </footer>
);

export default MessageInput;