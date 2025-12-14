/**
 * Authentication Routes (v1)
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const db = require('../../db');
const emailService = require('../../services/emailService');
const redisService = require('../../services/redis');
const logger = require('../../services/logger');
const apmService = require('../../services/apm');
const { authenticateToken } = require('../../middleware/auth');
const rateLimiters = require('../../middleware/rateLimiter');

const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Helper functions
function generateAccessToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, plan: user.plan || 'free' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: JWT_ACCESS_EXPIRY }
    );
}

function generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
}

function generateEmailVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
}

function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// Register
router.post('/register', rateLimiters.auth, [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
        .matches(/[0-9]/).withMessage('Password must contain a number')
], async (req, res) => {
    const startTime = Date.now();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        apmService.trackRequest('POST', '/v1/auth/register', 400, Date.now() - startTime);
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Check if user exists
        const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
            apmService.trackRequest('POST', '/v1/auth/register', 400, Date.now() - startTime);
            return res.status(400).json({ error: 'An account with this email already exists' });
        }

        // Create user
        const result = await db.query(
            'INSERT INTO users (email, password_hash, plan, email_verified) VALUES ($1, $2, $3, $4) RETURNING id, email, plan, email_verified',
            [email, hashedPassword, 'free', false]
        );

        const user = result.rows[0];
        
        // Generate email verification token
        const verificationToken = generateEmailVerificationToken();
        const tokenHash = hashToken(verificationToken);
        const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY);

        await db.query(
            'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [user.id, tokenHash, expiresAt]
        );

        // Send verification email
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
        await emailService.sendVerificationEmail(email, verificationUrl);

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken();
        const refreshTokenHash = hashToken(refreshToken);
        const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        // Store refresh token in database
        await db.query(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [user.id, refreshTokenHash, refreshExpiresAt]
        );

        // Cache refresh token in Redis (optional, for faster lookups)
        await redisService.set(`refresh_token:${refreshTokenHash}`, {
            userId: user.id,
            expiresAt: refreshExpiresAt.toISOString(),
        }, 7 * 24 * 60 * 60); // 7 days

        const responseTime = Date.now() - startTime;
        apmService.trackRequest('POST', '/v1/auth/register', 201, responseTime);

        res.status(201).json({ 
            accessToken, 
            refreshToken,
            expiresIn: JWT_ACCESS_EXPIRY,
            user: { 
                id: user.id, 
                email: user.email, 
                plan: user.plan, 
                emailVerified: user.email_verified 
            },
            message: 'Registration successful. Please check your email to verify your account.'
        });
    } catch (error) {
        logger.logError(error, { endpoint: '/v1/auth/register' });
        apmService.trackError(error, { endpoint: '/v1/auth/register' });
        apmService.trackRequest('POST', '/v1/auth/register', 500, Date.now() - startTime);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// Login
router.post('/login', rateLimiters.auth, [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
], async (req, res) => {
    const startTime = Date.now();
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        apmService.trackRequest('POST', '/v1/auth/login', 400, Date.now() - startTime);
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        // Check Redis cache first for user session
        const cacheKey = `user_session:${email}`;
        const cachedSession = await redisService.get(cacheKey);
        
        let user;
        if (cachedSession) {
            // Verify password against cached hash (if we cache it)
            // For security, we still query DB for password verification
            const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
            if (result.rows.length === 0) {
                apmService.trackRequest('POST', '/v1/auth/login', 401, Date.now() - startTime);
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            user = result.rows[0];
        } else {
            const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
            if (result.rows.length === 0) {
                apmService.trackRequest('POST', '/v1/auth/login', 401, Date.now() - startTime);
                return res.status(401).json({ error: 'Invalid email or password' });
            }
            user = result.rows[0];
        }

        const passwordValid = await bcrypt.compare(password, user.password_hash);

        if (!passwordValid) {
            apmService.trackRequest('POST', '/v1/auth/login', 401, Date.now() - startTime);
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken();
        const refreshTokenHash = hashToken(refreshToken);
        const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

        await db.query(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [user.id, refreshTokenHash, refreshExpiresAt]
        );

        // Cache refresh token in Redis
        await redisService.set(`refresh_token:${refreshTokenHash}`, {
            userId: user.id,
            expiresAt: refreshExpiresAt.toISOString(),
        }, 7 * 24 * 60 * 60);

        // Cache user session in Redis (1 hour)
        await redisService.set(`user_session:${email}`, {
            id: user.id,
            email: user.email,
            plan: user.plan,
        }, 3600);

        const responseTime = Date.now() - startTime;
        apmService.trackRequest('POST', '/v1/auth/login', 200, responseTime);

        res.json({ 
            accessToken, 
            refreshToken,
            expiresIn: JWT_ACCESS_EXPIRY,
            user: { 
                id: user.id, 
                email: user.email, 
                plan: user.plan || 'free',
                emailVerified: user.email_verified 
            }
        });
    } catch (error) {
        logger.logError(error, { endpoint: '/v1/auth/login' });
        apmService.trackError(error, { endpoint: '/v1/auth/login' });
        apmService.trackRequest('POST', '/v1/auth/login', 500, Date.now() - startTime);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// Refresh token
router.post('/refresh', [
    body('refreshToken').exists().withMessage('Refresh token required')
], async (req, res) => {
    const startTime = Date.now();
    const { refreshToken } = req.body;
    const tokenHash = hashToken(refreshToken);

    try {
        // Check Redis cache first
        const cacheKey = `refresh_token:${tokenHash}`;
        let cachedToken = await redisService.get(cacheKey);
        
        let tokenData;
        if (cachedToken) {
            // Verify token is still valid in database
            const result = await db.query(
                `SELECT rt.*, u.email, u.plan, u.email_verified 
                 FROM refresh_tokens rt 
                 JOIN users u ON rt.user_id = u.id 
                 WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
                [tokenHash]
            );
            if (result.rows.length === 0) {
                await redisService.del(cacheKey); // Remove invalid cache
                apmService.trackRequest('POST', '/v1/auth/refresh', 401, Date.now() - startTime);
                return res.status(401).json({ error: 'Invalid or expired refresh token', code: 'REFRESH_TOKEN_INVALID' });
            }
            tokenData = result.rows[0];
        } else {
            const result = await db.query(
                `SELECT rt.*, u.email, u.plan, u.email_verified 
                 FROM refresh_tokens rt 
                 JOIN users u ON rt.user_id = u.id 
                 WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
                [tokenHash]
            );
            if (result.rows.length === 0) {
                apmService.trackRequest('POST', '/v1/auth/refresh', 401, Date.now() - startTime);
                return res.status(401).json({ error: 'Invalid or expired refresh token', code: 'REFRESH_TOKEN_INVALID' });
            }
            tokenData = result.rows[0];
            
            // Cache for future lookups
            await redisService.set(cacheKey, {
                userId: tokenData.user_id,
                expiresAt: tokenData.expires_at.toISOString(),
            }, 7 * 24 * 60 * 60);
        }

        const user = { 
            id: tokenData.user_id, 
            email: tokenData.email, 
            plan: tokenData.plan || 'free',
            emailVerified: tokenData.email_verified
        };

        const accessToken = generateAccessToken(user);
        const responseTime = Date.now() - startTime;
        apmService.trackRequest('POST', '/v1/auth/refresh', 200, responseTime);

        res.json({ 
            accessToken, 
            expiresIn: JWT_ACCESS_EXPIRY,
            user 
        });
    } catch (error) {
        logger.logError(error, { endpoint: '/v1/auth/refresh' });
        apmService.trackError(error, { endpoint: '/v1/auth/refresh' });
        apmService.trackRequest('POST', '/v1/auth/refresh', 500, Date.now() - startTime);
        res.status(500).json({ error: 'Token refresh failed' });
    }
});

// Logout
router.post('/logout', [
    body('refreshToken').exists()
], async (req, res) => {
    const { refreshToken } = req.body;
    const tokenHash = hashToken(refreshToken);

    try {
        await db.query(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
            [tokenHash]
        );
        
        // Remove from Redis cache
        await redisService.del(`refresh_token:${tokenHash}`);
        
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        logger.logError(error, { endpoint: '/v1/auth/logout' });
        res.json({ message: 'Logged out successfully' }); // Don't fail on logout
    }
});

// Logout everywhere
router.post('/logout-all', authenticateToken, async (req, res) => {
    try {
        await db.query(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
            [req.user.id]
        );
        
        // Clear all cached sessions for this user
        // Note: This is a simplified approach. In production, you'd want to track all session keys
        await redisService.del(`user_session:*:${req.user.id}`);
        
        res.json({ message: 'Logged out from all devices successfully' });
    } catch (error) {
        logger.logError(error, { endpoint: '/v1/auth/logout-all' });
        res.status(500).json({ error: 'Failed to logout from all devices' });
    }
});

module.exports = router;
