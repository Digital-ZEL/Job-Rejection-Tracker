const logger = require('./logger');

// Simple APM (Application Performance Monitoring) service
// For production, consider using: New Relic, Datadog, or Elastic APM

class APMService {
    constructor() {
        this.metrics = {
            requests: {
                total: 0,
                byMethod: {},
                byEndpoint: {},
                byStatus: {}
            },
            responseTime: {
                min: Infinity,
                max: 0,
                sum: 0,
                count: 0,
                avg: 0
            },
            errors: {
                total: 0,
                byType: {},
                byEndpoint: {}
            },
            database: {
                queries: 0,
                slowQueries: 0,
                errors: 0
            },
            cache: {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0
            }
        };

        // Reset metrics every hour
        setInterval(() => {
            this.logMetrics();
            this.resetMetrics();
        }, 60 * 60 * 1000);
    }

    // Track HTTP request
    trackRequest(method, endpoint, statusCode, responseTime) {
        this.metrics.requests.total++;
        
        // By method
        this.metrics.requests.byMethod[method] = 
            (this.metrics.requests.byMethod[method] || 0) + 1;
        
        // By endpoint
        const normalizedEndpoint = this.normalizeEndpoint(endpoint);
        this.metrics.requests.byEndpoint[normalizedEndpoint] = 
            (this.metrics.requests.byEndpoint[normalizedEndpoint] || 0) + 1;
        
        // By status code
        const statusGroup = `${Math.floor(statusCode / 100)}xx`;
        this.metrics.requests.byStatus[statusGroup] = 
            (this.metrics.requests.byStatus[statusGroup] || 0) + 1;
        
        // Response time
        if (responseTime !== undefined) {
            this.metrics.responseTime.min = Math.min(this.metrics.responseTime.min, responseTime);
            this.metrics.responseTime.max = Math.max(this.metrics.responseTime.max, responseTime);
            this.metrics.responseTime.sum += responseTime;
            this.metrics.responseTime.count++;
            this.metrics.responseTime.avg = this.metrics.responseTime.sum / this.metrics.responseTime.count;
        }
    }

    // Track error
    trackError(error, endpoint) {
        this.metrics.errors.total++;
        
        const errorType = error.name || 'UnknownError';
        this.metrics.errors.byType[errorType] = 
            (this.metrics.errors.byType[errorType] || 0) + 1;
        
        if (endpoint) {
            const normalizedEndpoint = this.normalizeEndpoint(endpoint);
            this.metrics.errors.byEndpoint[normalizedEndpoint] = 
                (this.metrics.errors.byEndpoint[normalizedEndpoint] || 0) + 1;
        }
    }

    // Track database query
    trackDatabaseQuery(duration, isSlow = false, isError = false) {
        this.metrics.database.queries++;
        if (isSlow) this.metrics.database.slowQueries++;
        if (isError) this.metrics.database.errors++;
    }

    // Track cache operation
    trackCacheOperation(operation, hit = false) {
        if (operation === 'get') {
            if (hit) {
                this.metrics.cache.hits++;
            } else {
                this.metrics.cache.misses++;
            }
        } else if (operation === 'set') {
            this.metrics.cache.sets++;
        } else if (operation === 'delete') {
            this.metrics.cache.deletes++;
        }
    }

    // Normalize endpoint (remove IDs, etc.)
    normalizeEndpoint(endpoint) {
        return endpoint
            .replace(/\/\d+/g, '/:id')
            .replace(/\/[a-f0-9-]{36}/gi, '/:uuid')
            .replace(/\?.*$/, '');
    }

    // Get current metrics
    getMetrics() {
        return {
            ...this.metrics,
            timestamp: new Date().toISOString()
        };
    }

    // Log metrics summary
    logMetrics() {
        logger.info('📊 APM Metrics Summary:', {
            requests: {
                total: this.metrics.requests.total,
                byMethod: this.metrics.requests.byMethod,
                topEndpoints: this.getTopEndpoints(5),
                statusDistribution: this.metrics.requests.byStatus
            },
            performance: {
                avgResponseTime: `${this.metrics.responseTime.avg.toFixed(2)}ms`,
                minResponseTime: `${this.metrics.responseTime.min}ms`,
                maxResponseTime: `${this.metrics.responseTime.max}ms`
            },
            errors: {
                total: this.metrics.errors.total,
                byType: this.metrics.errors.byType
            },
            database: {
                queries: this.metrics.database.queries,
                slowQueries: this.metrics.database.slowQueries,
                errors: this.metrics.database.errors
            },
            cache: {
                hitRate: this.getCacheHitRate(),
                operations: {
                    hits: this.metrics.cache.hits,
                    misses: this.metrics.cache.misses,
                    sets: this.metrics.cache.sets
                }
            }
        });
    }

    // Get top endpoints by request count
    getTopEndpoints(limit = 10) {
        return Object.entries(this.metrics.requests.byEndpoint)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([endpoint, count]) => ({ endpoint, count }));
    }

    // Get cache hit rate
    getCacheHitRate() {
        const total = this.metrics.cache.hits + this.metrics.cache.misses;
        if (total === 0) return '0%';
        return `${((this.metrics.cache.hits / total) * 100).toFixed(2)}%`;
    }

    // Reset metrics
    resetMetrics() {
        this.metrics = {
            requests: {
                total: 0,
                byMethod: {},
                byEndpoint: {},
                byStatus: {}
            },
            responseTime: {
                min: Infinity,
                max: 0,
                sum: 0,
                count: 0,
                avg: 0
            },
            errors: {
                total: 0,
                byType: {},
                byEndpoint: {}
            },
            database: {
                queries: 0,
                slowQueries: 0,
                errors: 0
            },
            cache: {
                hits: 0,
                misses: 0,
                sets: 0,
                deletes: 0
            }
        };
    }
}

// Create singleton instance
const apmService = new APMService();

module.exports = apmService;
