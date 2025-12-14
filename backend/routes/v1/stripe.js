const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const db = require('../../db');
const logger = require('../../services/logger');
const apmService = require('../../services/apm');
const rateLimiters = require('../../middleware/rateLimiter');

// Create checkout session
router.post('/create-checkout-session', authenticateToken, rateLimiters.general, [
    body('plan').isIn(['professional', 'enterprise']).withMessage('Invalid plan'),
    body('priceId').exists().withMessage('Stripe price ID required')
], async (req, res) => {
    const startTime = Date.now();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        apmService.trackRequest('POST', '/v1/stripe/create-checkout-session', 400, Date.now() - startTime);
        return res.status(400).json({ errors: errors.array() });
    }

    const { plan, priceId } = req.body;

    try {
        let customerId;
        const subResult = await db.query(
            'SELECT stripe_customer_id FROM stripe_subscriptions WHERE user_id = $1',
            [req.user.id]
        );

        if (subResult.rows.length > 0 && subResult.rows[0].stripe_customer_id) {
            customerId = subResult.rows[0].stripe_customer_id;
        } else {
            const userResult = await db.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
            const customer = await stripe.customers.create({
                email: userResult.rows[0].email,
                metadata: { userId: req.user.id.toString() }
            });
            customerId = customer.id;

            await db.query(
                'INSERT INTO stripe_subscriptions (user_id, stripe_customer_id, plan, status) VALUES ($1, $2, $3, $4) ON CONFLICT (stripe_customer_id) DO NOTHING',
                [req.user.id, customerId, plan, 'pending']
            );
        }

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [{
                price: priceId,
                quantity: 1,
            }],
            mode: 'subscription',
            success_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing`,
            metadata: {
                userId: req.user.id.toString(),
                plan: plan
            }
        });

        apmService.trackRequest('POST', '/v1/stripe/create-checkout-session', 200, Date.now() - startTime);
        res.json({ sessionId: session.id, url: session.url });
    } catch (error) {
        logger.logError(error, { endpoint: '/v1/stripe/create-checkout-session' });
        apmService.trackError(error, { endpoint: '/v1/stripe/create-checkout-session' });
        apmService.trackRequest('POST', '/v1/stripe/create-checkout-session', 500, Date.now() - startTime);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Get subscription
router.get('/subscription', authenticateToken, async (req, res) => {
    const startTime = Date.now();
    try {
        const result = await db.query(
            `SELECT stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, cancel_at_period_end
             FROM stripe_subscriptions WHERE user_id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            apmService.trackRequest('GET', '/v1/stripe/subscription', 200, Date.now() - startTime);
            return res.json({ subscription: null });
        }

        apmService.trackRequest('GET', '/v1/stripe/subscription', 200, Date.now() - startTime);
        res.json({ subscription: result.rows[0] });
    } catch (error) {
        logger.logError(error, { endpoint: '/v1/stripe/subscription' });
        apmService.trackError(error, { endpoint: '/v1/stripe/subscription' });
        apmService.trackRequest('GET', '/v1/stripe/subscription', 500, Date.now() - startTime);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});

// Cancel subscription
router.post('/cancel-subscription', authenticateToken, async (req, res) => {
    const startTime = Date.now();
    try {
        const result = await db.query(
            'SELECT stripe_subscription_id FROM stripe_subscriptions WHERE user_id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0 || !result.rows[0].stripe_subscription_id) {
            apmService.trackRequest('POST', '/v1/stripe/cancel-subscription', 404, Date.now() - startTime);
            return res.status(404).json({ error: 'No active subscription found' });
        }

        const subscriptionId = result.rows[0].stripe_subscription_id;
        await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true
        });

        await db.query(
            'UPDATE stripe_subscriptions SET cancel_at_period_end = TRUE, updated_at = NOW() WHERE user_id = $1',
            [req.user.id]
        );

        apmService.trackRequest('POST', '/v1/stripe/cancel-subscription', 200, Date.now() - startTime);
        res.json({ message: 'Subscription will be cancelled at the end of the billing period' });
    } catch (error) {
        logger.logError(error, { endpoint: '/v1/stripe/cancel-subscription' });
        apmService.trackError(error, { endpoint: '/v1/stripe/cancel-subscription' });
        apmService.trackRequest('POST', '/v1/stripe/cancel-subscription', 500, Date.now() - startTime);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

module.exports = router;
