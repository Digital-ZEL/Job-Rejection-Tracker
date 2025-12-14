const apmService = require('../services/apm');

// APM tracking middleware
const apmMiddleware = (req, res, next) => {
    const startTime = Date.now();
    
    // Track request start
    res.on('finish', () => {
        const duration = Date.now() - startTime;
        const method = req.method;
        const endpoint = req.originalUrl || req.url;
        const statusCode = res.statusCode;
        
        // Track request
        apmService.trackRequest(method, endpoint, statusCode, duration);
        
        // Log slow requests
        if (duration > 1000) {
            apmService.trackDatabaseQuery(duration, true, false);
        }
    });
    
    // Track errors
    res.on('error', (err) => {
        apmService.trackError(err, req.originalUrl || req.url);
    });
    
    next();
};

// Database query tracking wrapper
const trackDatabaseQuery = async (queryFn, queryName) => {
    const startTime = Date.now();
    try {
        const result = await queryFn();
        const duration = Date.now() - startTime;
        
        // Track query
        apmService.trackDatabaseQuery(duration, duration > 500, false);
        
        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        apmService.trackDatabaseQuery(duration, false, true);
        throw error;
    }
};

// Cache operation tracking wrapper
const trackCacheOperation = async (operation, operationFn) => {
    const startTime = Date.now();
    try {
        const result = await operationFn();
        const duration = Date.now() - startTime;
        
        // Track cache operation
        if (operation === 'get') {
            apmService.trackCacheOperation('get', result !== null);
        } else if (operation === 'set') {
            apmService.trackCacheOperation('set');
        } else if (operation === 'delete') {
            apmService.trackCacheOperation('delete');
        }
        
        return result;
    } catch (error) {
        throw error;
    }
};

module.exports = {
    apmMiddleware,
    trackDatabaseQuery,
    trackCacheOperation
};
