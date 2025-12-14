/**
 * Smart Job Tracker API Server v4.0.0
 * Phase 3: Scale (Post-Launch)
 * 
 * Features:
 * - Redis for session caching
 * - Per-user rate limiting
 * - API versioning (v1, v2)
 * - Winston logging
 * - APM monitoring
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

// Services
const logger = require('./services/logger');
const redisService = require('./services/redis');
const apmService = require('./services/apm');
const db = require('./db');

// Middleware
const requestLogger = require('./middleware/requestLogger');
const apmMiddleware = require('./middleware/apmMiddleware');
const rateLimiters = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3001;

// ==========================================
// MIDDLEWARE SETUP
// ==========================================

app.use(helmet());

// Stripe webhook signature verification (must be before express.json())
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// CORS
const corsOptions = {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
    credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// HTTP logging with Winston (via Morgan)
app.use(morgan('combined', { stream: logger.stream }));

// Request logging middleware
app.use(requestLogger);

// APM middleware (tracks all requests)
app.use(apmMiddleware);

// ==========================================
// API VERSIONING
// ==========================================

// Import v1 routes
const v1Routes = require('./routes/v1');

// Mount versioned routes
app.use('/api/v1', rateLimiters.general, v1Routes);

// Legacy routes (redirect to v1 for backward compatibility)
app.use('/api', rateLimiters.general, (req, res, next) => {
    // Redirect to v1 if no version specified
    if (!req.path.startsWith('/v')) {
        req.url = `/v1${req.path}`;
    }
    next();
}, v1Routes);

// ==========================================
// HEALTH & MONITORING ENDPOINTS
// ==========================================

// Health check (no rate limiting)
app.get('/api/health', async (req, res) => {
    try {
        // Check database
        await db.query('SELECT 1');
        const dbHealthy = true;
        
        // Check Redis
        const redisHealthy = redisService.isConnected();
        
        const health = {
            status: dbHealthy && redisHealthy ? 'OK' : 'DEGRADED',
            timestamp: new Date().toISOString(),
            version: '4.0.0',
            services: {
                database: dbHealthy ? 'OK' : 'ERROR',
                redis: redisHealthy ? 'OK' : 'DISABLED',
            },
            features: [
                'postgresql',
                'redis-caching',
                'per-user-rate-limiting',
                'api-versioning',
                'winston-logging',
                'apm-monitoring',
                'stripe',
                'email-verification',
                'password-reset',
                'pagination'
            ]
        };
        
        res.status(health.status === 'OK' ? 200 : 503).json(health);
    } catch (error) {
        logger.logError(error, { endpoint: '/api/health' });
        res.status(503).json({
            status: 'ERROR',
            timestamp: new Date().toISOString(),
            error: 'Health check failed'
        });
    }
});

// APM Metrics endpoint (protected)
app.get('/api/metrics', rateLimiters.general, async (req, res) => {
    try {
        const metrics = apmService.getMetrics();
        res.json(metrics);
    } catch (error) {
        logger.logError(error, { endpoint: '/api/metrics' });
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
});

// APM Health endpoint
app.get('/api/apm/health', rateLimiters.general, async (req, res) => {
    try {
        const health = apmService.getHealth();
        res.json(health);
    } catch (error) {
        logger.logError(error, { endpoint: '/api/apm/health' });
        res.status(500).json({ error: 'Failed to fetch APM health' });
    }
});

// API info
app.get('/api', (req, res) => {
    res.json({
        name: 'Smart Job Tracker API',
        version: '4.0.0',
        apiVersions: ['v1'],
        endpoints: {
            v1: {
                auth: [
                    'POST /api/v1/auth/register',
                    'POST /api/v1/auth/login',
                    'POST /api/v1/auth/refresh',
                    'POST /api/v1/auth/logout',
                    'POST /api/v1/auth/logout-all'
                ],
                user: [
                    'GET /api/v1/user/me',
                    'POST /api/v1/user/upgrade'
                ],
                applications: [
                    'GET /api/v1/applications',
                    'POST /api/v1/applications',
                    'PUT /api/v1/applications/:id',
                    'DELETE /api/v1/applications/:id'
                ],
                analytics: [
                    'GET /api/v1/analytics'
                ],
                stripe: [
                    'POST /api/v1/stripe/create-checkout-session',
                    'GET /api/v1/stripe/subscription',
                    'POST /api/v1/stripe/cancel-subscription'
                ]
            },
            system: [
                'GET /api/health',
                'GET /api/metrics',
                'GET /api/apm/health'
            ]
        }
    });
});

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use((req, res) => {
    logger.warn('404 Not Found', { url: req.originalUrl, method: req.method });
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.logError(err, { 
        endpoint: req.originalUrl,
        method: req.method,
        userId: req.user?.id 
    });
    apmService.trackError(err, {
        endpoint: req.originalUrl,
        method: req.method,
    });
    
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
});

// ==========================================
// SERVER STARTUP
// ==========================================

// Initialize APM
apmService.start();

// Create logs directory if it doesn't exist
if (process.env.NODE_ENV === 'production') {
    const logDir = process.env.LOG_DIR || './logs';
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
        logger.info(`Created logs directory: ${logDir}`);
    }
}

const server = app.listen(PORT, () => {
    logger.info('🚀 Smart Job Tracker API v4.0.0');
    logger.info(`   Server running on port ${PORT}`);
    logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`   Database: PostgreSQL`);
    logger.info(`   Redis: ${redisService.isConnected() ? 'Connected' : 'Disabled'}`);
    logger.info(`   Health check: http://localhost:${PORT}/api/health`);
    logger.info(`   Metrics: http://localhost:${PORT}/api/metrics`);
});

// ==========================================
// GRACEFUL SHUTDOWN
// ==========================================

function gracefulShutdown(signal) {
    logger.info(`${signal} received. Starting graceful shutdown...`);
    
    // Stop APM
    apmService.stop();
    
    server.close(() => {
        logger.info('✅ HTTP server closed');
        
        // Close database connection pool
        db.pool.end((err) => {
            if (err) {
                logger.error('❌ Error closing database pool', { error: err.message });
                process.exit(1);
            }
            logger.info('✅ Database connection pool closed');
            
            // Close Redis connection
            redisService.close().then(() => {
                logger.info('✅ Redis connection closed');
                logger.info('👋 Graceful shutdown complete');
                process.exit(0);
            }).catch((err) => {
                logger.error('❌ Error closing Redis', { error: err.message });
                logger.info('👋 Graceful shutdown complete');
                process.exit(0);
            });
        });
    });

    // Force close after 10 seconds
    setTimeout(() => {
        logger.error('⚠️  Forcing shutdown after timeout');
        process.exit(1);
    }, 10000);
}

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.logError(err, { type: 'uncaughtException' });
    apmService.trackError(err, { type: 'uncaughtException' });
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection', { reason, promise });
    apmService.trackError(new Error(String(reason)), { type: 'unhandledRejection' });
});

module.exports = app;
