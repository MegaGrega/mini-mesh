const { redis, subRedis } = require('./db');

const ZONE = process.env.ZONE || "TOP_LEFT"; 
const BOUNDARY = 0; // (0,0) is the center

console.log(`Simulation Node [${ZONE}] started...`);

subRedis.subscribe('player_inputs');

subRedis.on('message', async (channel, message) => {
    const data = JSON.parse(message);
    let pos = JSON.parse(await redis.get(`player:${data.id}:pos`)) || { x: 0, y: 0 };

    // QUADRANT LOGIC
    const isTop = pos.y < BOUNDARY;
    const isLeft = pos.x < BOUNDARY;

    let isOwnedByMe = false;
    if (ZONE === "TOP_LEFT" && isTop && isLeft) isOwnedByMe = true;
    if (ZONE === "TOP_RIGHT" && isTop && !isLeft) isOwnedByMe = true;
    if (ZONE === "BOTTOM_LEFT" && !isTop && isLeft) isOwnedByMe = true;
    if (ZONE === "BOTTOM_RIGHT" && !isTop && !isLeft) isOwnedByMe = true;

    if (isOwnedByMe) {
        if (data.action === 'MOVE_RIGHT') pos.x += 10;
        if (data.action === 'MOVE_LEFT')  pos.x -= 10;
        if (data.action === 'MOVE_UP')    pos.y -= 10;
        if (data.action === 'MOVE_DOWN')  pos.y += 10;

        await redis.set(`player:${data.id}:pos`, JSON.stringify(pos));
        console.log(`[${ZONE}] Handled ${data.id} at (${pos.x}, ${pos.y})`);
    }
});