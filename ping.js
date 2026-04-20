require('dotenv').config();
const Redis = require('ioredis');

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
});

redis.ping()
  .then(response => {
    console.log("Connection Successful! Redis replied with:", response);
    process.exit();
  })
  .catch(err => {
    console.error("Connection Failed:", err.message);
    process.exit(1);
  });