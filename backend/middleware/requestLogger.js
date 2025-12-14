/**
 * Request Logger Middleware
 * Logs all HTTP requests with Winston
 */

const logger = require('../services/logger');

const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        logger.logRequest(req, res, responseTime);
    });
    
    next();
};

module.exports = requestLogger;
