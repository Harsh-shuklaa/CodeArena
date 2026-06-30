const Redis = require("ioredis");

let redis = null;
let isConnected = false;
let hasLoggedOffline = false; // Track log state to prevent terminal console spam

/**
 * Initialize Redis connection client.
 * Configured with a custom retry strategy to prevent requests from hanging if Redis goes offline.
 */
const initRedis = () => {
  const redisUri = process.env.REDIS_URI || "redis://127.0.0.1:6379";
  
  console.log(`[REDIS] Attempting connection to: ${redisUri}`);
  
  redis = new Redis(redisUri, {
    maxRetriesPerRequest: 1, // Fail fast on connection loss to fallback to memory
    connectTimeout: 2000,
    retryStrategy(times) {
      // Retry every 5 seconds to reduce reconnection attempt overhead
      return 5000;
    }
  });

  redis.on("connect", () => {
    isConnected = true;
    hasLoggedOffline = false; // Reset when connected
    console.log("[REDIS] Connected successfully to storage core.");
  });

  redis.on("error", (err) => {
    isConnected = false;
    if (!hasLoggedOffline) {
      console.warn(`[REDIS] Storage core at ${redisUri} is unreachable. Degrading gracefully to in-memory rate limiting...`);
      hasLoggedOffline = true;
    }
  });

  redis.on("close", () => {
    isConnected = false;
    if (!hasLoggedOffline) {
      console.warn("[REDIS] Connection closed. Falling back to local memory rate limiting.");
      hasLoggedOffline = true;
    }
  });

  return redis;
};

const getRedisClient = () => {
  if (!redis) {
    initRedis();
  }
  return redis;
};

const isRedisConnected = () => {
  // Trigger initialization if not already initialized
  if (!redis) {
    getRedisClient();
  }
  return isConnected;
};

module.exports = {
  getRedisClient,
  isRedisConnected
};
