import { handlePlayerLeave } from './utils/roomUtils.js';
import { registerLobbyHandlers } from './handlers/lobbyHandler.js';
import { registerGameHandlers } from './handlers/gameHandler.js';
import { registerVoteHandlers } from './handlers/voteHandler.js';

const registerSocketHandlers = (io, chloe_model) => {
    io.on('connection', (socket) => {
        console.log(`User connected: ${socket.id}`);

        // Register all the event handlers from our separated modules
        registerLobbyHandlers(io, socket);
        registerGameHandlers(io, socket, chloe_model);
        registerVoteHandlers(io, socket);

        // Handle general events like leaving and disconnecting
        socket.on('leaveRoom', async ({ roomId }) => {
            await handlePlayerLeave(socket, roomId, io);
        });

        socket.on('disconnect', async () => {
            console.log(`User disconnected: ${socket.id}`);
            const roomId = socket.data.roomId;
            await handlePlayerLeave(socket, roomId, io);
        });
    });
};

export default registerSocketHandlers;