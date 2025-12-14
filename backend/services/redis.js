const redis = require('redis');
const logger = require('./logger');

// Create Redis client
const client = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    socket: {
        reconnectStrategy: (retries) => {
            if (retries > 10) {
                logger.error('Redis: Too many reconnection attempts, giving up');
                return new Error('Too many retries');
            }
            const delay = Math.min(retries * 50, 500);
            logger.warn(`Redis: Reconnecting in ${delay}ms (attempt ${retries})`);
            return delay;
        }
    }
});

// Error handling
client.on('error', (err) => {
    logger.error('Redis Client Error:', err);
});

client.on('connect', () => {
    logger.info('Redis: Connecting...');
});

client.on('ready', () => {
    logger.info('✅ Redis connected and ready');
});

client.on('reconnecting', () => {
    logger.warn('Redis: Reconnecting...');
});

// Connect to Redis
(async () => {
    try {
        await client.connect();
    } catch (err) {
        logger.error('Redis connection failed:', err);
        // Don't crash the app if Redis is unavailable
        // The app will work without caching
    }
})();

// Redis helper functions
const redisService = {
    // Get value from cache
    async get(key) {
        try {
            if (!client.isOpen) return null;
            const value = await client.get(key);
            return value ? JSON.parse(value) : null;
        } catch (err) {
            logger.error(`Redis GET error for key ${key}:`, err);
            return null;
        }
    },

    // Set value in cache with expiration
    async set(key, value, expirationSeconds = null) {
        try {
            if (!client.isOpen) return false;
            const stringValue = JSON.stringify(value);
            if (expirationSeconds) {
                await client.setEx(key, expirationSeconds, stringValue);
            } else {
                await client.set(key, stringValue);
            }
            return true;
        } catch (err) {
            logger.error(`Redis SET error for key ${key}:`, err);
            return false;
        }
    },

    // Delete key from cache
    async del(key) {
        try {
            if (!client.isOpen) return false;
            await client.del(key);
            return true;
        } catch (err) {
            logger.error(`Redis DEL error for key ${key}:`, err);
            return false;
        }
    },

    // Delete multiple keys matching pattern
    async delPattern(pattern) {
        try {
            if (!client.isOpen) return false;
            const keys = await client.keys(pattern);
            if (keys.length > 0) {
                await client.del(keys);
            }
            return true;
        } catch (err) {
            logger.error(`Redis DEL pattern error for ${pattern}:`, err);
            return false;
        }
    },

    // Increment counter (for rate limiting)
    async incr(key, expirationSeconds = null) {
        try {
            if (!client.isOpen) return null;
            const count = await client.incr(key);
            if (count === 1 && expirationSeconds) {
                await client.expire(key, expirationSeconds);
            }
            return count;
        } catch (err) {
            logger.error(`Redis INCR error for key ${key}:`, err);
            return null;
        }
    },

    // Check if key exists
    async exists(key) {
        try {
            if (!client.isOpen) return false;
            const result = await client.exists(key);
            return result === 1;
        } catch (err) {
            logger.error(`Redis EXISTS error for key ${key}:`, err);
            return false;
        }
    },

    // Get TTL (time to live) of a key
    async ttl(key) {
        try {
            if (!client.isOpen) return -1;
            return await client.ttl(key);
        } catch (err) {
            logger.error(`Redis TTL error for key ${key}:`, err);
            return -1;
        }
    },

    // Close Redis connection
    async close() {
        try {
            if (client.isOpen) {
                await client.quit();
                logger.info('Redis connection closed');
            }
        } catch (err) {
            logger.error('Redis close error:', err);
        }
    },

    // Check if Redis is available
    isAvailable() {
        return client.isOpen;
    }
};

module.exports = redisService;
