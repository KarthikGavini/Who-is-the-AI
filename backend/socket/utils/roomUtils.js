import Room from '../../models/Room.js';

export const handlePlayerLeave = async (socket, roomId, io) => {
    if (!roomId) return;
    try {
        const room = await Room.findOne({ roomId });
        if (!room) return;

        const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex === -1) return;

        const removedPlayer = room.players.splice(playerIndex, 1)[0];
        const wasHost = room.hostId === socket.id;
        console.log(`Player ${removedPlayer.nickname} left room ${roomId}.`);

        if (room.players.length === 0) {
            await Room.deleteOne({ roomId });
            console.log(`Room ${roomId} is empty and has been deleted.`);
        } else {
            if (wasHost && room.players.length > 0) {
                room.hostId = room.players[0].socketId;
            }
            const updatedRoom = await room.save();
            io.to(roomId).emit('roomUpdate', updatedRoom);
        }

        // --- THE FIX IS HERE: Add this line back ---
        socket.leave(roomId);

    } catch (err) {
        console.error(`Error during player leave for room ${roomId}:`, err);
    }
};