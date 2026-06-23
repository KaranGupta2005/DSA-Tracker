/**
 * In-memory rate limiting middleware factory.
 * Creates a rate limiter with configurable window and max requests.
 *
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} maxRequests - Maximum requests allowed within the window
 * @returns {Function} Express middleware
 */
const createRateLimit = (windowMs = 15 * 60 * 1000, maxRequests = 100) => {
  const requests = new Map();

  // Periodically clean up expired entries to prevent memory leaks
  const cleanup = () => {
    const now = Date.now();
    for (const [key, entry] of requests) {
      if (now - entry.windowStart >= windowMs) {
        requests.delete(key);
      }
    }
  };

  const cleanupInterval = setInterval(cleanup, windowMs);
  // Allow the process to exit without waiting for cleanup
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    const entry = requests.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      // Start a new window
      requests.set(key, { windowStart: now, count: 1 });
      return next();
    }

    if (entry.count >= maxRequests) {
      const retryAfterMs = windowMs - (now - entry.windowStart);
      const retryAfterSec = Math.ceil(retryAfterMs / 1000);

      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please try again later.',
          details: { retryAfterSeconds: retryAfterSec },
        },
      });
    }

    entry.count += 1;
    next();
  };
};

// Pre-configured rate limiters
const generalRateLimit = createRateLimit(15 * 60 * 1000, 500); // 500 requests per 15 min
const aiRateLimit = createRateLimit(60 * 1000, 10); // 10 requests per 1 min (stricter for AI endpoints)

module.exports = { createRateLimit, generalRateLimit, aiRateLimit };
