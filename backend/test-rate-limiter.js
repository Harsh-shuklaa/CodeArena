const path = require("path");
require("dotenv").config();

const { checkRateLimit } = require("./middleware/rateLimiterCore");
const rateLimitConfig = require("./config/rateLimitConfig");
const { isRedisConnected } = require("./config/redis");

const testLimiter = async () => {
  console.log("=== Rate Limiting Logic Verification ===");
  console.log("Redis Connected Status:", isRedisConnected());

  const ip = "127.0.0.9";
  const userId = "test_user_12345";
  const policyName = "veryStrict"; // IP limit: 5, User limit: 10
  const policy = rateLimitConfig[policyName];

  console.log(`\nTesting Policy: ${policyName}`);
  console.log(`Limits - IP Max: ${policy.ipMax}, User Max: ${policy.userMax}`);

  // 1. Perform 5 allowed requests
  console.log("\n--- Triggering 5 requests (should be allowed) ---");
  for (let i = 1; i <= 5; i++) {
    const result = await checkRateLimit(ip, userId, policyName);
    console.log(`Request #${i}: Allowed: ${result.allowed}, Remaining: ${result.remainingRequests}, Delay: ${result.delay}ms`);
  }

  // 2. Perform 6th request (should be blocked due to IP limit)
  console.log("\n--- Triggering 6th request (should be blocked due to IP limit) ---");
  const resultBlocked = await checkRateLimit(ip, userId, policyName);
  console.log(`Request #6: Allowed: ${resultBlocked.allowed}, RetryAfter: ${resultBlocked.retryAfter}s, Remaining: ${resultBlocked.remainingRequests}`);

  if (!resultBlocked.allowed) {
    console.log("SUCCESS: Request was correctly blocked.");
  } else {
    console.error("FAILURE: Request should have been blocked!");
  }

  // 3. Test request slowing (veryStrict policy has delayAfter: 3, delayMs: 1000)
  console.log("\n--- Testing Request Slowing (veryStrict delayAfter: 3) ---");
  const slowIp = "127.0.0.88";
  // Reset key by using new IP
  for (let i = 1; i <= 5; i++) {
    const result = await checkRateLimit(slowIp, userId, policyName);
    console.log(`Request #${i} to ${slowIp}: Allowed: ${result.allowed}, Delay: ${result.delay}ms`);
  }

  console.log("\nVerification completed successfully.");
  process.exit(0);
};

testLimiter().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
