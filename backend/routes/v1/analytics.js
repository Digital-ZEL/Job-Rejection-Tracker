const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const db = require('../../db');
const logger = require('../../services/logger');
const apmService = require('../../services/apm');

router.get('/', authenticateToken, async (req, res) => {
    const startTime = Date.now();
    const userId = req.user.id;

    try {
        const stageResult = await db.query(
            'SELECT stage, COUNT(*) as count FROM applications WHERE user_id = $1 AND deleted_at IS NULL GROUP BY stage',
            [userId]
        );

        const monthlyResult = await db.query(
            `SELECT TO_CHAR(date_applied, 'YYYY-MM') as month, COUNT(*) as count 
             FROM applications 
             WHERE user_id = $1 AND deleted_at IS NULL 
             GROUP BY month ORDER BY month DESC LIMIT 12`,
            [userId]
        );

        const sourceResult = await db.query(
            'SELECT source, COUNT(*) as count FROM applications WHERE user_id = $1 AND deleted_at IS NULL AND source IS NOT NULL GROUP BY source',
            [userId]
        );

        const analytics = {
            total: 0,
            stages: {},
            monthly: monthlyResult.rows,
            sources: sourceResult.rows,
            rates: {}
        };

        stageResult.rows.forEach(row => {
            analytics.stages[row.stage] = parseInt(row.count);
            analytics.total += parseInt(row.count);
        });

        if (analytics.total > 0) {
            analytics.rates.interview = Math.round(((analytics.stages.interview || 0) / analytics.total) * 100);
            analytics.rates.offer = Math.round(((analytics.stages.offer || 0) / analytics.total) * 100);
            analytics.rates.rejection = Math.round(((analytics.stages.rejected || 0) / analytics.total) * 100);
            analytics.rates.ghosted = Math.round(((analytics.stages.ghosted || 0) / analytics.total) * 100);
            analytics.rates.response = 100 - analytics.rates.ghosted;
        }

        apmService.trackRequest('GET', '/v1/analytics', 200, Date.now() - startTime);
        res.json(analytics);
    } catch (error) {
        logger.logError(error, { endpoint: '/v1/analytics' });
        apmService.trackError(error, { endpoint: '/v1/analytics' });
        apmService.trackRequest('GET', '/v1/analytics', 500, Date.now() - startTime);
        res.status(500).json({ error: 'Database error' });
    }
});

module.exports = router;
