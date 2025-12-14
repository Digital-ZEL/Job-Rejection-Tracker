/**
 * API v1 Routes
 * Main API routes for version 1
 */

const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth');
const userRoutes = require('./user');
const applicationRoutes = require('./applications');
const analyticsRoutes = require('./analytics');
const stripeRoutes = require('./stripe');

// Mount routes
router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/applications', applicationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/stripe', stripeRoutes);

// Health check for v1
router.get('/health', (req, res) => {
    res.json({
        version: '1.0.0',
        status: 'OK',
        timestamp: new Date().toISOString(),
    });
});

module.exports = router;
