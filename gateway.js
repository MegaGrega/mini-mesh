require('dotenv').config();
const { redis } = require('./db');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static('public'));

// 1. Session Tracker: Maps playerId -> socket.id
const activeSessions = new Map();

io.on('connection', (socket) => {
    
    socket.on('join_game', async (data) => {
        const playerId = data.username || `anon_${socket.id.substring(0,5)}`; 
        
        // --- SESSION KICK LOGIC ---
        // If this player ID is already connected elsewhere, disconnect the old one
        if (activeSessions.has(playerId)) {
            const oldSocketId = activeSessions.get(playerId);
            
            // Send a message to the old tab so the user knows why it stopped
            io.to(oldSocketId).emit('kick_message', 'Logged in from another location.');
            
            // Force the old socket to disconnect
            const oldSocket = io.sockets.sockets.get(oldSocketId);
            if (oldSocket) {
                console.log(`Kicking duplicate session for ${playerId} (ID: ${oldSocketId})`);
                oldSocket.disconnect(true); 
            }
        }

        // Register the new session
        activeSessions.set(playerId, socket.id);
        console.log(`🎮 Player ${playerId} joined [Socket: ${socket.id}]`);

        try {
            const exists = await redis.exists(`player:${playerId}:pos`);
            if (!exists) {
                await redis.hset(`player:${playerId}:pos`, { x: 0, y: 0, lastUpdater: 'SYSTEM' });
                console.log(`Created new profile for ${playerId}`);
            }

            socket.on('move', async (direction) => {
                // Because of the kick logic, we are guaranteed this is the ONLY 
                // socket currently allowed to move this playerId.
                const intent = JSON.stringify({ id: playerId, action: direction });
                await redis.publish('raw_intents', intent);
            });

        } catch (err) {
            console.error("Join Error:", err.message);
        }
    });

    // 2. Clean up the map when a player leaves or is kicked
    socket.on('disconnect', () => {
        for (let [pId, sId] of activeSessions.entries()) {
            if (sId === socket.id) {
                activeSessions.delete(pId);
                console.log(`🔌 Session cleared for ${pId}`);
                break;
            }
        }
    });
});

/**
 * STATE BROADCAST LOOP (30ms)
 */
setInterval(async () => {
    try {
        const keys = await redis.keys('player:*:pos');
        const updates = [];
        for (const key of keys) {
            const data = await redis.hgetall(key);
            const id = key.split(':')[1];
            if (data && data.x !== undefined) {
                updates.push({
                    id: id,
                    x: parseInt(data.x),
                    y: parseInt(data.y),
                    lastUpdater: data.lastUpdater
                });
            }
        }
        if (updates.length > 0) {
            io.emit('state_update', { players: updates, timestamp: Date.now() });
        }
    } catch (err) { /* Quiet */ }
}, 16);

const shutdown = async () => {
    console.log("\n--- Cleaning up Gateway... ---");
    if (redis) await redis.quit();
    process.exit(0);
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(3000, () => console.log('Gateway live at http://localhost:3000'));