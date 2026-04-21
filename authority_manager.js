require('dotenv').config();
const { redis, subRedis } = require('./db');

console.log("Authority Manager is online...");

/**
 * Spatial Partitioning Logic
 * Maps (x, y) coordinates to the specific simulator responsible for that area.
 * Defaults to 0,0 and positive quadrant
 */
function getTargetChannel(x, y) {
    if (x < 0 && y < 0) return 'TOP_LEFT';
    if (x >= 0 && y < 0) return 'TOP_RIGHT';
    if (x < 0 && y >= 0) return 'BOTTOM_LEFT';
    return 'BOTTOM_RIGHT';
}

// 1. Subscribe to the raw input from the Gateway
subRedis.subscribe('raw_intents', (err, count) => {
    if (err) {
        console.error("Failed to subscribe to raw_intents:", err.message);
        return;
    }
    console.log(`[MANAGER] Listening for player intents. Monitoring ${count} channel(s).`);
});

// 2. Handle incoming intents
subRedis.on('message', async (channel, message) => {
    if (channel !== 'raw_intents') return;

    try {
        const { id, action } = JSON.parse(message);
        
        // Use HGETALL instead of GET
        const pos = await redis.hgetall(`player:${id}:pos`);
        
        // pos will be an object like { x: "0", y: "0" } or empty {}
        // We cast them to Numbers because Redis Hashes store everything as strings
        const x = parseInt(pos.x || 0);
        const y = parseInt(pos.y || 0);

        const zone = getTargetChannel(x, y);
        const targetChannel = `input:${zone}`;

        const listeners = await redis.publish(targetChannel, JSON.stringify({ id, action }));
        
        if (listeners === 0) {
            console.warn(`[MANAGER] No listeners on ${targetChannel}`);
        } else {
            console.log(`[MANAGER] Routed ${action} to ${targetChannel}`);
        }

    } catch (err) {
        console.error("[MANAGER] Routing Error:", err.message);
    }
});

// Keep process alive and handle errors
subRedis.on('error', (err) => console.error("Redis Sub Error:", err));
redis.on('error', (err) => console.error("Redis Client Error:", err));