const rateLimit = require('express-rate-limit');
const redisService = require('../services/redis');
const logger = require('../services/logger');

// Custom store for Redis-based rate limiting
class RedisStore {
    constructor() {
        this.prefix = 'ratelimit:';
    }

    async increment(key, cb) {
        try {
            const redisKey = `${this.prefix}${key}`;
            const count = await redisService.incr(redisKey, 900); // 15 minutes TTL
            
            cb(null, {
                totalHits: count,
                resetTime: new Date(Date.now() + 900000) // 15 minutes from now
            });
        } catch (err) {
            logger.error('Redis rate limit error:', err);
            // Fallback: allow request if Redis fails
            cb(null, { totalHits: 1, resetTime: new Date() });
        }
    }

    async decrement(key) {
        // Not needed for our use case
    }

    async resetKey(key) {
        const redisKey = `${this.prefix}${key}`;
        await redisService.del(redisKey);
    }
}

// IP-based rate limiter (fallback)
const ipLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: { error: 'Too many requests from this IP, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Per-user rate limiter (uses Redis)
const createUserRateLimiter = (windowMs, max) => {
    const limiter = rateLimit({
        windowMs,
        max,
        message: { error: 'Too many requests, please try again later.' },
        standardHeaders: true,
        legacyHeaders: false,
        // Custom key generator to use user ID
        keyGenerator: (req) => {
            // Use user ID if authenticated, otherwise fall back to IP
            return req.user ? `user:${req.user.id}` : `ip:${req.ip}`;
        },
        // Use Redis store if available, otherwise use memory
        store: redisService.isAvailable() ? new RedisStore() : undefined,
        skip: (req) => {
            // Skip rate limiting for health checks
            return req.path === '/api/health' || req.path === '/api';
        }
    });

    return limiter;
};

// Different limits for different endpoints
const rateLimiters = {
    // General API rate limit (per user)
    general: createUserRateLimiter(15 * 60 * 1000, 200), // 200 requests per 15 minutes per user
    
    // Auth endpoints (stricter)
    auth: createUserRateLimiter(15 * 60 * 1000, 10), // 10 requests per 15 minutes
    
    // Password reset (very strict)
    passwordReset: createUserRateLimiter(60 * 60 * 1000, 3), // 3 requests per hour
    
    // Email verification (strict)
    emailVerification: createUserRateLimiter(15 * 60 * 1000, 5), // 5 requests per 15 minutes
    
    // Stripe webhooks (no limit, but authenticated)
    stripe: rateLimit({
        windowMs: 60 * 1000, // 1 minute
        max: 100, // Stripe can send many webhooks
        message: { error: 'Too many webhook requests.' },
        skip: () => true, // Skip for now, Stripe handles its own rate limiting
    }),
};

module.exports = {
    ipLimiter,
    ...rateLimiters
};
