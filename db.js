require('dotenv').config();
const Redis = require('ioredis');

const config = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
};

// Two identical connections
const redis = new Redis(config);      // For GET/SET 
const subRedis = new Redis(config);   // For SUBSCRIBE

module.exports = { redis, subRedis };