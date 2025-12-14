/**
 * Database Query Helper with APM Tracking
 */

const { Pool } = require('pg');
const logger = require('./services/logger');
const apmService = require('./services/apm');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Wrapper for query with APM tracking
const db = {
    query: async (text, params) => {
        const startTime = Date.now();
        try {
            const result = await pool.query(text, params);
            const duration = Date.now() - startTime;
            
            apmService.trackDatabaseQuery(text, duration);
            logger.logDatabaseQuery(text, duration, params);
            
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            apmService.trackDatabaseQuery(text, duration, error);
            logger.logError(error, { query: text.substring(0, 200) });
            throw error;
        }
    },
    
    getClient: () => pool.connect(),
    
    pool: pool,
};

module.exports = db;
