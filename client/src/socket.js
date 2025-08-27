// src/socket.js
import { io } from 'socket.io-client';

// Connect to your backend server
const URL = 'http://localhost:5002';
export const socket = io(URL);