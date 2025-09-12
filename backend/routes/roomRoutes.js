import express from 'express';
import Room from '../models/Room.js';

const router = express.Router();

const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
};

// @route   POST /api/rooms/create
// @desc    Create a new game room (always private)
router.post('/create', async (req, res) => {
    try {
        let newRoomId;
        let roomExists = true;
        while (roomExists) {
            newRoomId = generateRoomId();
            const existingRoom = await Room.findOne({ roomId: newRoomId });
            if (!existingRoom) {
                roomExists = false;
            }
        }

        const newRoom = new Room({
            roomId: newRoomId,
            hostId: 'placeholder-host-id',
            players: [],
            isPublic: false, // --- MODIFIED: Explicitly set as private
        });

        await newRoom.save();
        res.status(201).json({ roomId: newRoom.roomId });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

// @route   POST /api/rooms/find-public
// @desc    Find an available public room or create a new one
router.post('/find-public', async (req, res) => {
    try {
        const bestLobbies = await Room.aggregate([
            // --- MODIFIED: Only match rooms that are public AND in lobby ---
            { $match: { gameState: 'lobby', isPublic: true } }, 
            { $addFields: { playerCount: { $size: '$players' } } },
            { $match: { $expr: { $lt: ['$playerCount', '$maxPlayers'] } } },
            { $sort: { playerCount: -1 } },
            { $limit: 1 }
        ]);

        const bestLobby = bestLobbies[0];

        if (bestLobby) {
            console.log(`Found public lobby: ${bestLobby.roomId}`);
            return res.json({ roomId: bestLobby.roomId, created: false });
        } else {
            console.log("No public lobbies found. Creating a new one.");
            let newRoomId;
            let roomExists = true;
            while (roomExists) {
                newRoomId = generateRoomId();
                const existingRoom = await Room.findOne({ roomId: newRoomId });
                if (!existingRoom) {
                    roomExists = false;
                }
            }

            const newRoom = new Room({
                roomId: newRoomId,
                hostId: 'placeholder-host-id',
                players: [],
                isPublic: true, // --- MODIFIED: New rooms created this way are public
            });

            await newRoom.save();
            return res.status(201).json({ roomId: newRoom.roomId, created: true });
        }
    } catch (err) {
        console.error("Error finding public room:", err.message);
        res.status(500).send('Server Error');
    }
});


export default router;