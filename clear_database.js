const { redis } = require('./db');

async function nuke() {
    await redis.flushdb();
    console.log("DATABASE WIPED: The universe is now empty.");
    process.exit();
}

nuke();