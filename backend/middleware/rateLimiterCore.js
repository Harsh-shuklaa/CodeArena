const rateLimitConfig = require("../config/rateLimitConfig");
const { getRedisClient, isRedisConnected } = require("../config/redis");

const memoryStore = new Map();

/**
 * Log security incidents with detailed information
 */
const logSecurityIncident = (type, details) => {
  const timestamp = new Date().toISOString();
  console.warn(`[SECURITY WARNING] [${timestamp}] [${type.toUpperCase()}]`, JSON.stringify(details));
};

/**
 * Memory-based rate limiter (Graceful fallback when Redis is offline)
 */
const checkMemoryLimit = (ip, userId, policyName, policy) => {
  const now = Date.now();
  const windowMs = policy.windowMs;
  const ipMax = policy.ipMax;
  const userMax = policy.userMax;
  const ipUserMax = policy.ipUserMax;

  const ipKey = `mem:ip:${ip}:${policyName}`;
  const userKey = userId ? `mem:user:${userId}:${policyName}` : null;
  const ipUserKey = userId ? `mem:ip_user:${ip}:${userId}:${policyName}` : null;

  const getLimitState = (key) => {
    let state = memoryStore.get(key);
    if (!state || now > state.resetAt) {
      state = { count: 0, resetAt: now + windowMs };
      memoryStore.set(key, state);
    }
    return state;
  };

  const ipState = getLimitState(ipKey);
  ipState.count++;

  let userState = null;
  if (userKey) {
    userState = getLimitState(userKey);
    userState.count++;
  }

  let ipUserState = null;
  if (ipUserKey) {
    ipUserState = getLimitState(ipUserKey);
    ipUserState.count++;
  }

  let exceeded = false;
  let exceededKey = null;
  let retryAfter = 0;

  if (ipState.count > ipMax) {
    exceeded = true;
    exceededKey = "IP";
    retryAfter = Math.max(retryAfter, Math.ceil((ipState.resetAt - now) / 1000));
  }
  if (userState && userState.count > userMax) {
    exceeded = true;
    exceededKey = "User";
    retryAfter = Math.max(retryAfter, Math.ceil((userState.resetAt - now) / 1000));
  }
  if (ipUserState && ipUserState.count > ipUserMax) {
    exceeded = true;
    exceededKey = "IP+User";
    retryAfter = Math.max(retryAfter, Math.ceil((ipUserState.resetAt - now) / 1000));
  }

  // Calculate remaining requests
  const ipRemaining = Math.max(0, ipMax - ipState.count);
  const userRemaining = userState ? Math.max(0, userMax - userState.count) : Infinity;
  const ipUserRemaining = ipUserState ? Math.max(0, ipUserMax - ipUserState.count) : Infinity;
  const remaining = Math.min(ipRemaining, userRemaining, ipUserRemaining);

  // Calculate delay (request slowing)
  let delay = 0;
  if (policy.delayMs && policy.delayAfter && ipState.count > policy.delayAfter) {
    delay = (ipState.count - policy.delayAfter) * policy.delayMs;
  }

  if (exceeded) {
    logSecurityIncident("RATE_LIMIT_BLOCKED", {
      ip,
      userId,
      policyName,
      reason: `Memory limit exceeded for ${exceededKey}`,
      ipCount: ipState.count,
      userCount: userState ? userState.count : 0,
      ipUserCount: ipUserState ? ipUserState.count : 0
    });
    return { allowed: false, retryAfter, remainingRequests: 0, delay };
  }

  // Log suspicious high traffic pattern before hit block threshold
  if (ipState.count > ipMax * 0.8) {
    logSecurityIncident("SUSPICIOUS_TRAFFIC", { ip, userId, policyName, ipCount: ipState.count });
  }

  return { allowed: true, retryAfter: 0, remainingRequests: remaining, delay };
};

/**
 * Core rate limiting checker
 * Performs atomic IP, User ID, and IP+User combination checks.
 */
const checkRateLimit = async (ip, userId, policyName) => {
  const policy = rateLimitConfig[policyName];
  if (!policy) {
    // If policy is not configured, allow request
    return { allowed: true, retryAfter: 0, remainingRequests: 9999, delay: 0 };
  }

  const windowSeconds = Math.ceil(policy.windowMs / 1000);
  const ipMax = policy.ipMax;
  const userMax = policy.userMax;
  const ipUserMax = policy.ipUserMax;

  // Keys
  const ipKey = `ratelimit:ip:${ip}:${policyName}`;
  const userKey = userId ? `ratelimit:user:${userId}:${policyName}` : null;
  const ipUserKey = userId ? `ratelimit:ip_user:${ip}:${userId}:${policyName}` : null;

  let useMemoryFallback = !isRedisConnected();

  if (!useMemoryFallback) {
    try {
      const client = getRedisClient();
      const pipeline = client.pipeline();

      pipeline.incr(ipKey).ttl(ipKey);
      if (userKey) pipeline.incr(userKey).ttl(userKey);
      if (ipUserKey) pipeline.incr(ipUserKey).ttl(ipUserKey);

      const results = await pipeline.exec();

      // results: [[err, count], [err, ttl], ...]
      const ipCount = results[0][1];
      let ipTtl = results[1][1];
      if (ipTtl < 0) {
        await client.expire(ipKey, windowSeconds);
        ipTtl = windowSeconds;
      }

      let userCount = 0;
      let userTtl = 0;
      if (userKey) {
        userCount = results[2][1];
        userTtl = results[3][1];
        if (userTtl < 0) {
          await client.expire(userKey, windowSeconds);
          userTtl = windowSeconds;
        }
      }

      let ipUserCount = 0;
      let ipUserTtl = 0;
      if (ipUserKey) {
        ipUserCount = results[4][1];
        ipUserTtl = results[5][1];
        if (ipUserTtl < 0) {
          await client.expire(ipUserKey, windowSeconds);
          ipUserTtl = windowSeconds;
        }
      }

      let exceeded = false;
      let exceededKey = null;
      let retryAfter = 0;

      if (ipCount > ipMax) {
        exceeded = true;
        exceededKey = "IP";
        retryAfter = Math.max(retryAfter, ipTtl);
      }
      if (userKey && userCount > userMax) {
        exceeded = true;
        exceededKey = "User";
        retryAfter = Math.max(retryAfter, userTtl);
      }
      if (ipUserKey && ipUserCount > ipUserMax) {
        exceeded = true;
        exceededKey = "IP+User";
        retryAfter = Math.max(retryAfter, ipUserTtl);
      }

      // Calculate remaining requests
      const ipRemaining = Math.max(0, ipMax - ipCount);
      const userRemaining = userKey ? Math.max(0, userMax - userCount) : Infinity;
      const ipUserRemaining = ipUserKey ? Math.max(0, ipUserMax - ipUserCount) : Infinity;
      const remaining = Math.min(ipRemaining, userRemaining, ipUserRemaining);

      // Calculate delay (request slowing)
      let delay = 0;
      if (policy.delayMs && policy.delayAfter && ipCount > policy.delayAfter) {
        delay = (ipCount - policy.delayAfter) * policy.delayMs;
      }

      if (exceeded) {
        logSecurityIncident("RATE_LIMIT_BLOCKED", {
          ip,
          userId,
          policyName,
          reason: `Redis limit exceeded for ${exceededKey}`,
          ipCount,
          userCount,
          ipUserCount
        });
        
        // Log potential Brute Force attack on Authentication endpoints
        if (policyName === "veryStrict") {
          logSecurityIncident("BRUTE_FORCE_WARNING", { ip, userId, policyName, count: ipCount });
        }

        return { allowed: false, retryAfter, remainingRequests: 0, delay };
      }

      // Log suspicious high traffic patterns
      if (ipCount > ipMax * 0.8) {
        logSecurityIncident("API_ABUSE_PATTERN", { ip, userId, policyName, count: ipCount });
      }

      return { allowed: true, retryAfter: 0, remainingRequests: remaining, delay };
    } catch (err) {
      console.error("[RATE LIMIT REDIS ERROR] Falling back to memory limits:", err.message);
      useMemoryFallback = true;
    }
  }

  if (useMemoryFallback) {
    return checkMemoryLimit(ip, userId, policyName, policy);
  }
};

// Periodically prune memory store to prevent leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, state] of memoryStore.entries()) {
    if (now > state.resetAt) {
      memoryStore.delete(key);
    }
  }
}, 60000).unref();

module.exports = {
  checkRateLimit,
  logSecurityIncident
};
