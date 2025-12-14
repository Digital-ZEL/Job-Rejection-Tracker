const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../../middleware/auth');
const db = require('../../db');
const logger = require('../../services/logger');
const apmService = require('../../services/apm');
const FREE_TIER_LIMIT = 5;

// Get all applications (with pagination)
router.get('/', authenticateToken, async (req, res) => {
    const startTime = Date.now();
    const { stage, search, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    let query = 'SELECT * FROM applications WHERE user_id = $1 AND deleted_at IS NULL';
    let countQuery = 'SELECT COUNT(*) as total FROM applications WHERE user_id = $1 AND deleted_at IS NULL';
    let params = [req.user.id];
    let countParams = [req.user.id];
    let paramCount = 2;

    if (stage) {
        query += ` AND stage = $${paramCount}`;
        countQuery += ` AND stage = $${paramCount}`;
        params.push(stage);
        countParams.push(stage);
        paramCount++;
    }

    if (search) {
        const searchTerm = `%${search}%`;
        query += ` AND (company ILIKE $${paramCount} OR role ILIKE $${paramCount} OR notes ILIKE $${paramCount})`;
        countQuery += ` AND (company ILIKE $${paramCount} OR role ILIKE $${paramCount} OR notes ILIKE $${paramCount})`;
        params.push(searchTerm, searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm, searchTerm);
        paramCount += 3;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(parseInt(limit), parseInt(offset));

    try {
        const countResult = await db.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].total);

        const result = await db.query(query, params);
        
        apmService.trackRequest('GET', '/v1/applications', 200, Date.now() - startTime);
        res.json({
            applications: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        logger.logError(error, { endpoint: '/v1/applications' });
        apmService.trackError(error, { endpoint: '/v1/applications' });
        apmService.trackRequest('GET', '/v1/applications', 500, Date.now() - startTime);
        res.status(500).json({ error: 'Database error' });
    }
});

// Create application
router.post('/', authenticateToken, [
    body('company').notEmpty().trim().escape(),
    body('role').notEmpty().trim().escape(),
    body('stage').isIn(['applied', 'interview', 'offer', 'rejected', 'ghosted'])
], async (req, res) => {
    const startTime = Date.now();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        apmService.trackRequest('POST', '/v1/applications', 400, Date.now() - startTime);
        return res.status(400).json({ errors: errors.array() });
    }

    try {
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

        if (plan === 'free' && count >= FREE_TIER_LIMIT) {
            apmService.trackRequest('POST', '/v1/applications', 403, Date.now() - startTime);
            return res.status(403).json({ 
                error: 'Free tier limit reached',
                code: 'LIMIT_REACHED',
                currentCount: count,
                limit: FREE_TIER_LIMIT,
                plan: plan
            });
        }

        const { company, role, location, source, stage, notes, salary_min, salary_max } = req.body;

        const result = await db.query(
            `INSERT INTO applications (user_id, company, role, location, source, stage, notes, salary_min, salary_max) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
            [req.user.id, company, role, location, source, stage, notes, salary_min, salary_max]
        );

        apmService.trackRequest('POST', '/v1/applications', 201, Date.now() - startTime);
        res.status(201).json({ 
            id: result.rows[0].id, 
            message: 'Application created successfully',
            remainingSlots: plan === 'free' ? FREE_TIER_LIMIT - count - 1 : Infinity
        });
    } catch (error) {
        logger.logError(error, { endpoint: '/v1/applications' });
        apmService.trackError(error, { endpoint: '/v1/applications' });
        apmService.trackRequest('POST', '/v1/applications', 500, Date.now() - startTime);
        res.status(500).json({ error: 'Failed to create application' });
    }
});

// Update application
router.put('/:id', authenticateToken, [
    body('stage').optional().isIn(['applied', 'interview', 'offer', 'rejected', 'ghosted'])
], async (req, res) => {
    const startTime = Date.now();
    const { id } = req.params;
    const { company, role, location, source, stage, notes, salary_min, salary_max } = req.body;

    try {
        const result = await db.query(
            `UPDATE applications SET company = $1, role = $2, location = $3, source = $4, stage = $5, 
             notes = $6, salary_min = $7, salary_max = $8, updated_at = NOW() 
             WHERE id = $9 AND user_id = $10 AND deleted_at IS NULL RETURNING id`,
            [company, role, location, source, stage, notes, salary_min, salary_max, id, req.user.id]
        );

        if (result.rows.length === 0) {
            apmService.trackRequest('PUT', '/v1/applications/:id', 404, Date.now() - startTime);
            return res.status(404).json({ error: 'Application not found' });
        }

        apmService.trackRequest('PUT', '/v1/applications/:id', 200, Date.now() - startTime);
        res.json({ message: 'Application updated successfully' });
    } catch (error) {
        logger.logError(error, { endpoint: '/v1/applications/:id' });
        apmService.trackError(error, { endpoint: '/v1/applications/:id' });
        apmService.trackRequest('PUT', '/v1/applications/:id', 500, Date.now() - startTime);
        res.status(500).json({ error: 'Failed to update application' });
    }
});

// Delete application
router.delete('/:id', authenticateToken, async (req, res) => {
    const startTime = Date.now();
    const { id } = req.params;

    try {
        const result = await db.query(
            'UPDATE applications SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING id',
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            apmService.trackRequest('DELETE', '/v1/applications/:id', 404, Date.now() - startTime);
            return res.status(404).json({ error: 'Application not found' });
        }

        apmService.trackRequest('DELETE', '/v1/applications/:id', 200, Date.now() - startTime);
        res.json({ message: 'Application deleted successfully' });
    } catch (error) {
        logger.logError(error, { endpoint: '/v1/applications/:id' });
        apmService.trackError(error, { endpoint: '/v1/applications/:id' });
        apmService.trackRequest('DELETE', '/v1/applications/:id', 500, Date.now() - startTime);
        res.status(500).json({ error: 'Failed to delete application' });
    }
});

module.exports = router;
