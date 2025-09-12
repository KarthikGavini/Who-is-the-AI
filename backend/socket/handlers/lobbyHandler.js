import Room from '../../models/Room.js';

const newLobbyMap = new Map();

export const registerLobbyHandlers = (io, socket) => {
    // socket.on('joinRoom', async ({ roomId, nickname }) => { /* ...logic... */ });
    // socket.on('updateGameSettings', async (payload) => { /* ...logic... */ });
    // socket.on('updateLobbyType', async (payload) => { /* ...logic... */ });
    // socket.on('findOrCreateLobby', async (payload) => { /* ...logic... */ });

    socket.on('joinRoom', async ({ roomId, nickname }) => {
        try {
            // This single, atomic operation tries to add a new player ONLY if all conditions are met.
            const updatedRoom = await Room.findOneAndUpdate(
                {
                    roomId: roomId,
                    gameState: 'lobby', // Condition: Must be in lobby
                    'players.socketId': { $ne: socket.id }, // Condition: Player's socket.id not already in the room
                    $expr: { $lt: [{ $size: '$players' }, '$maxPlayers'] } // Condition: Room is not full
                },
                { $push: { players: { socketId: socket.id, nickname } } }, // Action: Add the player
                { new: true }
            );

            if (updatedRoom) {
                // This block runs if the player was successfully added.
                socket.join(roomId);
                socket.data.roomId = roomId;

                let finalRoom = updatedRoom;
                // If this is the very first player, make them the host.
                if (finalRoom.players.length === 1) {
                    finalRoom.hostId = socket.id;
                    finalRoom = await finalRoom.save();
                }

                console.log(`Player ${nickname} (${socket.id}) joined room ${roomId}`);
                io.to(roomId).emit('roomUpdate', finalRoom);
            } else {
                // If the update failed, it's because a condition wasn't met.
                // Check the room state again to send a specific error.
                const room = await Room.findOne({ roomId });
                if (!room) return socket.emit('error', 'Room not found');

                // This handles the second "join" request from developer mode; just send the room data.
                if (room.players.some(p => p.socketId === socket.id)) {
                    console.log(`Player ${socket.id} already in room ${roomId}. Sending update.`);
                    socket.join(roomId);
                    socket.data.roomId = roomId;
                    return io.to(socket.id).emit('roomUpdate', room);
                }
                if (room.gameState !== 'lobby') return socket.emit('error', 'This game has already started.');
                if (room.players.length >= room.maxPlayers) return socket.emit('error', 'This room is full.');
            }

        } catch (err) {
            console.error("Error during joinRoom:", err);
            socket.emit('error', 'Server error during join');
        }
    });

    socket.on('updateGameSettings', async ({ roomId, maxPlayers, gameDuration }) => {

        try {
            const room = await Room.findOne({ roomId });

            // 1. Security Check: Only the host can change game settings.
            if (!room || socket.id !== room.hostId) {
                console.log(`Non-host user ${socket.id} tried to change settings.`);
                return; // Silently ignore the request if the user is not the host.
            }

            // 2. Data Validation: Update settings if they are valid.
            if (maxPlayers && (maxPlayers >= 3 && maxPlayers <= 5)) {
                room.maxPlayers = maxPlayers;
            }

            // A list of allowed durations in seconds
            const allowedDurations = [10, 60, 120, 180, 240, 300];
            if (gameDuration && allowedDurations.includes(gameDuration)) {
                room.gameDuration = gameDuration;
            }

            await room.save();

            // 3. Broadcast Update: Inform all players in the room of the new settings.
            io.to(roomId).emit('roomUpdate', room);
            console.log(`Host ${socket.id} updated settings for room ${roomId}`);

        } catch (err) {
            console.error(`Error updating settings for room ${roomId}:`, err);
        }
    });

    socket.on('updateLobbyType', async ({ roomId, isPublic }) => {
        try {
            const room = await Room.findOne({ roomId });
            // Security Check: Only the host can change the lobby type.
            if (!room || socket.id !== room.hostId) {
                console.log(`Non-host user ${socket.id} tried to change lobby type.`);
                return;
            }

            // Update the setting
            room.isPublic = isPublic;
            await room.save();

            // Broadcast the update to all players in the room
            io.to(roomId).emit('roomUpdate', room);
            console.log(`Host ${socket.id} changed lobby type for room ${roomId} to ${isPublic ? 'Public' : 'Private'}`);

        } catch (err) {
            console.error(`Error updating lobby type for room ${roomId}:`, err);
        }
    });

    socket.on('findOrCreateLobby', async ({ oldRoomId }) => {
        console.log(`[Backend] Received 'findOrCreateLobby' for old room: ${oldRoomId}`);
        try {
            let newRoomId;

            if (newLobbyMap.has(oldRoomId)) {
                newRoomId = newLobbyMap.get(oldRoomId);
                console.log(`[Backend] Found existing new lobby. ID: ${newRoomId}`);
            } else {
                newRoomId = Math.random().toString(36).substring(2, 6).toUpperCase();
                console.log(`[Backend] Creating new lobby with ID: ${newRoomId}`);
                const newRoom = new Room({
                    roomId: newRoomId,
                    players: [],
                    hostId: socket.id // --- THE FIX IS HERE --- The player who creates the lobby is the new host.
                });
                await newRoom.save(); // This will now succeed!
                newLobbyMap.set(oldRoomId, newRoomId);
                console.log(`[Backend] New lobby ${newRoomId} saved to DB and mapped.`);
            }

            console.log(`[Backend] Emitting 'navigateToNewLobby' back to client with ID: ${newRoomId}`);
            socket.emit('navigateToNewLobby', newRoomId);

        } catch (err) {
            console.error(`[Backend] CRITICAL ERROR in findOrCreateLobby:`, err);
        }
    });
};