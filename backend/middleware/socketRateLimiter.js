const { checkRateLimit } = require("./rateLimiterCore");
const rateLimitConfig = require("../config/rateLimitConfig");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// Mapping of Socket.IO event names to rate limit policies
const SOCKET_POLICY_MAP = {
  joinQueue: "medium",          // Matchmaking queue entry
  chatMessage: "medium",        // Chat message transmission
  runCode: "strict",            // Compile and execute sample run (heavy)
  submitCode: "controlled",     // Submission check on hidden testcases (very heavy)
  joinRoom: "medium",           // Enter duel room/lobby
  selectOpponent: "medium",     // Admin opponent slot choice
  removeUser: "medium",         // Admin kick request
  leaveRoom: "medium",          // Lobby exit
  toggleReady: "medium",        // Ready state toggling
  updateLobbySettings: "medium", // Settings modification
  startMatch: "medium",         // Admin start duel
  cancelMatch: "medium",        // Admin cancel duel
  opponentStatus: "relaxed",    // Keystroke typing feedback
  autosaveCode: "relaxed"       // Live code edits autosave
};

/**
 * Socket.IO Rate Limiting Interceptor
 */
const socketRateLimiter = (socket, next) => {
  // Use packet middleware to intercept incoming packets/events
  socket.use(async (packet, nextEvent) => {
    const eventName = packet[0];
    const policyName = SOCKET_POLICY_MAP[eventName];

    // If event is not mapped to any policy, bypass rate limiting
    if (!policyName) {
      return nextEvent();
    }

    let ip = socket.handshake.address || socket.conn.remoteAddress;
    if (ip && ip.startsWith("::ffff:")) {
      ip = ip.substring(7);
    }
    
    const userId = socket.user ? socket.user._id.toString() : null;

    try {
      const result = await checkRateLimit(ip, userId, policyName);

      if (!result.allowed) {
        console.warn(`[SOCKET RATE LIMIT] Blocked event '${eventName}' from user ${userId || "Guest"} (IP: ${ip}). Remaining: 0`);
        
        // Emit custom event back to client to notify of limit exceed
        socket.emit("rateLimitExceeded", {
          success: false,
          error: "RATE_LIMIT_EXCEEDED",
          message: `Too many requests for event '${eventName}'. Please try again later.`,
          retryAfter: `${result.retryAfter}`,
          remainingRequests: 0,
          event: eventName
        });

        // Do not call nextEvent() to block event execution
        return;
      }

      // Handle request slowing (progressive delay)
      if (result.delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, result.delay));
      }

      nextEvent();
    } catch (error) {
      console.error(`[SOCKET RATE LIMIT INTERCEPT ERROR] Event: ${eventName}`, error);
      // Fail-open to avoid disrupting client experience on unexpected exceptions
      nextEvent();
    }
  });

  next();
};

module.exports = {
  socketRateLimiter,
  SOCKET_POLICY_MAP
};
