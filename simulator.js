require('dotenv').config();
const { redis, subRedis } = require('./db');

const ZONE = (process.env.ZONE || process.argv[2] || "").trim().toUpperCase();

if (!ZONE) {
    console.error("CRITICAL ERROR: No ZONE defined.");
    process.exit(1);
}

/**
 * DISTRIBUTED LOCK LOGIC
 * Prevents multiple simulators from running the same zone simultaneously.
 */
const lockKey = `lock:zone:${ZONE}`;
const lockTimeout = 10000; // 10 seconds

async function acquireLock() {
    // NX = Set if Not Exists | EX = Expire in 10s
    // We use a unique value (timestamp) to identify this specific instance
    const instanceId = `node_${Date.now()}`;
    const result = await redis.set(lockKey, instanceId, 'NX', 'EX', lockTimeout / 1000);

    if (result !== 'OK') {
        console.error(`\n[${ZONE}] FATAL: Another simulator is already authoritative for this zone.`);
        console.error(`[${ZONE}] Shutdown initiated to prevent Split-Brain collision.\n`);
        process.exit(1);
    }

    console.log(`[${ZONE}] Lock acquired. Authority confirmed.`);

    // HEARTBEAT: Refresh the lock every 5 seconds to keep it from expiring
    setInterval(async () => {
        try {
            await redis.expire(lockKey, lockTimeout / 1000);
        } catch (err) {
            console.error(`[${ZONE}] Heartbeat failure:`, err.message);
        }
    }, 5000);
}

// Start the sequence
async function start() {
    await acquireLock();

    console.log(`>>> Simulator Node [${ZONE}] is now AUTHORITATIVE.`);

    const channelName = `input:${ZONE}`;

    // 1. Subscribe to the channel
    subRedis.subscribe(channelName, (err, count) => {
        if (err) console.error(`[${ZONE}] Sub error:`, err.message);
        else console.log(`[${ZONE}] Listening on: ${channelName}`);
    });

    // 2. Atomic Message Handling
    subRedis.on('message', async (channel, message) => {
        if (channel !== channelName) return;

        try {
            const { id, action } = JSON.parse(message);
            const playerKey = `player:${id}:pos`;
            const speed = 5;

            // ATOMIC OPERATIONS
            switch (action) {
                case 'MOVE_UP':    await redis.hincrby(playerKey, 'y', -speed); break;
                case 'MOVE_DOWN':  await redis.hincrby(playerKey, 'y', speed);  break;
                case 'MOVE_LEFT':  await redis.hincrby(playerKey, 'x', -speed); break;
                case 'MOVE_RIGHT': await redis.hincrby(playerKey, 'x', speed);  break;
                default: return;
            }

            // Update Metadata
            await redis.hset(playerKey, {
                lastUpdater: ZONE,
                lastProcessed: Date.now()
            });

            // Optional: Remove console logs in production to reduce IO hitching
            const current = await redis.hgetall(playerKey);
            console.log(`[${ZONE}] Moved ${id} to (${current.x}, ${current.y})`);

        } catch (err) {
            console.error(`[${ZONE}] Error:`, err.message);
        }
    });
}

start();