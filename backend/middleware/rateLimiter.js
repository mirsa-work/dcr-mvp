// backend/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');

/**
 * Factory that returns a rate-limit middleware.
 * @param {Object} options – override defaults if needed
 */
module.exports = function createRateLimiter(options = {}) {
  return rateLimit({
    windowMs: 60_000,          // 1 minute window
    max: 5,                    // 5 attempts per window per IP
    standardHeaders: true,     // RateLimit-* headers
    legacyHeaders: false,      // X-RateLimit-* headers
    message: { error: 'Too many login attempts, please wait 1 minute' },
    ...options
  });
};
