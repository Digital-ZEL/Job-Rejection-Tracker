const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../../middleware/auth');
const db = require('../../db');
const logger = require('../../services/logger');
const apmService = require('../../services/apm');
const FREE_TIER_LIMIT = 5;

router.get('/me', authenticateToken, async (req, res) => {
    const startTime = Date.now();
    try {
        const result = await db.query(
            'SELECT id, email, plan, email_verified, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            apmService.trackRequest('GET', '/v1/user/me', 404, Date.now() - startTime);
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];
        const countResult = await db.query(
            `SELECT u.plan, COUNT(a.id) as app_count 
             FROM users u 
             LEFT JOIN applications a ON u.id = a.user_id AND a.deleted_at IS NULL
             WHERE u.id = $1
             GROUP BY u.id, u.plan`,
            [req.user.id]
        );

        const plan = countResult.rows[0]?.plan || 'free';
        const count = parseInt(countResult.rows[0]?.app_count || 0);
        const limit = plan === 'free' ? FREE_TIER_LIMIT : Infinity;

        apmService.trackRequest('GET', '/v1/user/me', 200, Date.now() - startTime);
        res.json({
            ...user,
            applicationCount: count,
            applicationLimit: limit,
            canAddMore: plan !== 'free' || count < FREE_TIER_LIMIT
        });
    } catch (error) {
        logger.logError(error, { endpoint: '/v1/user/me' });
        apmService.trackError(error, { endpoint: '/v1/user/me' });
        apmService.trackRequest('GET', '/v1/user/me', 500, Date.now() - startTime);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

router.post('/upgrade', authenticateToken, async (req, res) => {
    // Placeholder - Stripe integration handled in stripe routes
    res.status(501).json({ error: 'Use /api/v1/stripe/create-checkout-session to upgrade' });
});

module.exports = router;
