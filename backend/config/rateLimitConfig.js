/**
 * Rate Limiting Policies Configuration
 * Thresholds can be adjusted dynamically via environment variables.
 */
module.exports = {
  veryStrict: {
    // Auth endpoints: SignUp, Login, etc.
    windowMs: parseInt(process.env.LIMIT_VERY_STRICT_WINDOW_MS) || 60 * 1000, // 1 minute
    ipMax: parseInt(process.env.LIMIT_VERY_STRICT_IP_MAX) || 5, // max 5 per IP
    userMax: parseInt(process.env.LIMIT_VERY_STRICT_USER_MAX) || 10, // max 10 per User ID (if authenticated)
    ipUserMax: parseInt(process.env.LIMIT_VERY_STRICT_IP_USER_MAX) || 5, // max 5 per unique IP + User combo
    delayMs: parseInt(process.env.LIMIT_VERY_STRICT_DELAY_MS) || 1000, // delay multiplier (slowing)
    delayAfter: parseInt(process.env.LIMIT_VERY_STRICT_DELAY_AFTER) || 3, // slow down after 3 requests
  },
  strict: {
    // Heavy processes e.g. AI / code execution trial
    windowMs: parseInt(process.env.LIMIT_STRICT_WINDOW_MS) || 60 * 1000, // 1 minute
    ipMax: parseInt(process.env.LIMIT_STRICT_IP_MAX) || 10,
    userMax: parseInt(process.env.LIMIT_STRICT_USER_MAX) || 15,
    ipUserMax: parseInt(process.env.LIMIT_STRICT_IP_USER_MAX) || 10,
  },
  controlled: {
    // Official code submissions
    windowMs: parseInt(process.env.LIMIT_CONTROLLED_WINDOW_MS) || 60 * 1000, // 1 minute
    ipMax: parseInt(process.env.LIMIT_CONTROLLED_IP_MAX) || 10,
    userMax: parseInt(process.env.LIMIT_CONTROLLED_USER_MAX) || 15,
    ipUserMax: parseInt(process.env.LIMIT_CONTROLLED_IP_USER_MAX) || 10,
  },
  medium: {
    // Matchmaking, Lobby actions, Chat, Friend invites
    windowMs: parseInt(process.env.LIMIT_MEDIUM_WINDOW_MS) || 60 * 1000, // 1 minute
    ipMax: parseInt(process.env.LIMIT_MEDIUM_IP_MAX) || 30,
    userMax: parseInt(process.env.LIMIT_MEDIUM_USER_MAX) || 45,
    ipUserMax: parseInt(process.env.LIMIT_MEDIUM_IP_USER_MAX) || 30,
  },
  relaxed: {
    // Public Reads, Leaderboard, profile search, notification fetching
    windowMs: parseInt(process.env.LIMIT_RELAXED_WINDOW_MS) || 60 * 1000, // 1 minute
    ipMax: parseInt(process.env.LIMIT_RELAXED_IP_MAX) || 100,
    userMax: parseInt(process.env.LIMIT_RELAXED_USER_MAX) || 150,
    ipUserMax: parseInt(process.env.LIMIT_RELAXED_IP_USER_MAX) || 100,
  },
  secure: {
    // Administrative endpoints e.g. add new challenges
    windowMs: parseInt(process.env.LIMIT_SECURE_WINDOW_MS) || 60 * 1000, // 1 minute
    ipMax: parseInt(process.env.LIMIT_SECURE_IP_MAX) || 10,
    userMax: parseInt(process.env.LIMIT_SECURE_USER_MAX) || 15,
    ipUserMax: parseInt(process.env.LIMIT_SECURE_IP_USER_MAX) || 10,
  }
};
