const { redis } = require('./db');

async function checkPersistence() {
    const data = await redis.get('player:player1:pos');
    
    if (data) {
        const pos = JSON.parse(data);
        console.log("------------------------------------------");
        console.log(`REPLICATION LAYER STATE`);
        console.log(`Player1 is currently saved at X: ${pos.x}`);
        console.log("------------------------------------------");
    } else {
        console.log(" No player data found in the Replication Layer.");
    }

    process.exit();
}

checkPersistence();