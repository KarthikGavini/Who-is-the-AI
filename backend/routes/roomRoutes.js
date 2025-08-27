// routes/roomRoutes.js
import express from 'express';
import Room from '../models/Room.js';

const router = express.Router();

// A simple function to generate a 4-character random string
const generateRoomId = () => {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
};

// @route   POST /api/rooms/create
// @desc    Create a new game room
// @access  Public
router.post('/create', async (req, res) => {
    try {
        let newRoomId;
        let roomExists = true;

        // Ensure the generated roomId is unique
        while (roomExists) {
            newRoomId = generateRoomId();
            const existingRoom = await Room.findOne({ roomId: newRoomId });
            if (!existingRoom) {
                roomExists = false;
            }
        }

        // Note: The hostId is a placeholder. In Step 4, when the host connects
        // via Socket.IO, we will update this room with their actual socketId.
        const newRoom = new Room({
            roomId: newRoomId,
            hostId: 'placeholder-host-id', // This will be updated in the next step
            players: [], // The host will be added when they join via socket
        });

        await newRoom.save();

        res.status(201).json({ roomId: newRoom.roomId });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server Error');
    }
});

export default router;