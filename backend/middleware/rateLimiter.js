const { checkRateLimit } = require("./rateLimiterCore");
const rateLimitConfig = require("../config/rateLimitConfig");

/**
 * Express Rate Limiting Middleware
 * Supports policy names (e.g., rateLimit('veryStrict')) as well as
 * inline configuration options (e.g., rateLimit({ windowMs, max })) for full backward compatibility.
 */
const rateLimit = (policyOrOptions) => {
  let policyName;

  if (typeof policyOrOptions === "string") {
    policyName = policyOrOptions;
  } else if (typeof policyOrOptions === "object" && policyOrOptions !== null) {
    const windowMs = policyOrOptions.windowMs || 60000;
    const max = policyOrOptions.max || 10;
    policyName = `inline_${windowMs}_${max}`;

    // Register custom options dynamically in config map
    if (!rateLimitConfig[policyName]) {
      rateLimitConfig[policyName] = {
        windowMs,
        ipMax: max,
        userMax: Math.ceil(max * 1.5),
        ipUserMax: max,
        message: policyOrOptions.message
      };
    }
  } else {
    policyName = "medium"; // default fallback
  }

  return async (req, res, next) => {
    // Get client identifier details
    let ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    // Normalize IP format (strip IPv6 prefix if present)
    if (ip && ip.startsWith("::ffff:")) {
      ip = ip.substring(7);
    }
    const userId = req.user ? req.user._id.toString() : null;

    try {
      const result = await checkRateLimit(ip, userId, policyName);
      const policy = rateLimitConfig[policyName];

      if (!result.allowed) {
        const customMessage = policy.message || {
          message: "Too many requests. Please try again later."
        };

        // Return custom JSON rate limit exceeded structure
        return res.status(429).json({
          success: false,
          error: "RATE_LIMIT_EXCEEDED",
          message: typeof customMessage === "string" ? customMessage : (customMessage.message || "Too many requests. Please try again later."),
          retryAfter: `${result.retryAfter}`,
          remainingRequests: 0
        });
      }

      // Handle request slowing (progressive delay)
      if (result.delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, result.delay));
      }

      // Add response rate limit headers
      res.setHeader("X-RateLimit-Limit", policy.ipMax);
      res.setHeader("X-RateLimit-Remaining", result.remainingRequests);
      res.setHeader("X-RateLimit-Reset", result.retryAfter);

      next();
    } catch (error) {
      console.error("[RATE LIMIT MIDDLEWARE EXECUTION ERROR]", error);
      // Fail-open to ensure service availability if limits processing encounters a system error
      next();
    }
  };
};

module.exports = rateLimit;
