require('dotenv').config();
const { redis } = require('./db');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log('A player connected');

    socket.on('move', async (direction) => {
        const payload = JSON.stringify({ id: 'player1', action: direction });
        await redis.publish('player_inputs', payload);
    });
});

// Update the Gateway every 50ms to tell the browser where the player is
setInterval(async () => {
    const data = await redis.get('player:player1:pos');
    if (data) {
        const state = JSON.parse(data);
        // Attach the current server time in milliseconds
        state.timestamp = Date.now(); 
        io.emit('state_update', state);
    }
}, 50);

server.listen(3000, () => console.log('Gateway/Webserver running on http://localhost:3000'));