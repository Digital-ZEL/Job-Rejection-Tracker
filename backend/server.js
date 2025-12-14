const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Phase 3: Services
const logger = require('./services/logger');
const redisService = require('./services/redis');
const apmService = require('./services/apm');
const emailService = require('./services/emailService');

// Phase 3: Middleware
const { apiVersioning, versionedResponse } = require('./middleware/apiVersioning');
const { apmMiddleware, trackDatabaseQuery, trackCacheOperation } = require('./middleware/apmMiddleware');
const { general, auth, passwordReset, emailVerification } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3001;

// ==========================================
// CONFIGURATION
// ==========================================

// JWT Configuration
const JWT_ACCESS_EXPIRY = '15m';  // Access tokens expire in 15 minutes
const JWT_REFRESH_EXPIRY = '7d';  // Refresh tokens expire in 7 days
const FREE_TIER_LIMIT = 5;        // Free users can have max 5 applications

// Token expiration times
const PASSWORD_RESET_EXPIRY = 60 * 60 * 1000; // 1 hour
const EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key') {
    logger.warn('⚠️  WARNING: Using default JWT secret. Please set JWT_SECRET in production environment.');
}

// ==========================================
// DATABASE SETUP (PostgreSQL)
// ==========================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        logger.error('❌ Database connection error:', err);
    } else {
        logger.info('✅ PostgreSQL connected:', res.rows[0].now);
    }
});

// Initialize database schema
async function initializeDatabase() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Users table
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                plan VARCHAR(50) DEFAULT 'free',
                email_verified BOOLEAN DEFAULT FALSE,
                email_verified_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Applications table
        await client.query(`
            CREATE TABLE IF NOT EXISTS applications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                company VARCHAR(255) NOT NULL,
                role VARCHAR(255) NOT NULL,
                location VARCHAR(255),
                source VARCHAR(255),
                stage VARCHAR(50) NOT NULL DEFAULT 'applied',
                notes TEXT,
                salary_min INTEGER,
                salary_max INTEGER,
                date_applied TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deleted_at TIMESTAMP DEFAULT NULL
            )
        `);

        // Interviews table
        await client.query(`
            CREATE TABLE IF NOT EXISTS interviews (
                id SERIAL PRIMARY KEY,
                application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
                interview_type VARCHAR(100) NOT NULL,
                scheduled_date TIMESTAMP,
                notes TEXT,
                outcome VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Refresh tokens table
        await client.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                revoked_at TIMESTAMP DEFAULT NULL
            )
        `);

        // Password reset tokens table
        await client.query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Email verification tokens table
        await client.query(`
            CREATE TABLE IF NOT EXISTS email_verification_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                token_hash TEXT NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                used_at TIMESTAMP DEFAULT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Stripe subscriptions table
        await client.query(`
            CREATE TABLE IF NOT EXISTS stripe_subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                stripe_customer_id VARCHAR(255) UNIQUE,
                stripe_subscription_id VARCHAR(255) UNIQUE,
                stripe_price_id VARCHAR(255),
                plan VARCHAR(50) NOT NULL,
                status VARCHAR(50) NOT NULL,
                current_period_end TIMESTAMP,
                cancel_at_period_end BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create indexes
        await client.query('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_applications_user_stage ON applications(user_id, stage)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_applications_search ON applications(company, role)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_applications_deleted ON applications(deleted_at)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_hash ON email_verification_tokens(token_hash)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_user ON stripe_subscriptions(user_id)');
        await client.query('CREATE INDEX IF NOT EXISTS idx_stripe_subscriptions_customer ON stripe_subscriptions(stripe_customer_id)');

        await client.query('COMMIT');
        logger.info('✅ Database schema initialized');
    } catch (err) {
        await client.query('ROLLBACK');
        logger.error('❌ Database initialization error:', err);
    } finally {
        client.release();
    }
}

// Initialize on startup
initializeDatabase();

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(helmet());

// Stripe webhook signature verification (must be before express.json())
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));

// Phase 3: APM Middleware (track all requests)
app.use(apmMiddleware);

// Configure CORS from environment variable
const corsOptions = {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
    credentials: true
};
app.use(cors(corsOptions));
app.use(express.json());

// Phase 3: Use Winston logger with Morgan
app.use(morgan('combined', { stream: logger.stream }));

// Phase 3: API Versioning (must be before routes)
app.use('/api', apiVersioning);

// Phase 3: Per-user rate limiting (replaces IP-based)
app.use('/api/', general);
app.use('/api/login', auth);
app.use('/api/register', auth);
app.use('/api/password-reset', passwordReset);
app.use('/api/verify-email', emailVerification);
app.use('/api/resend-verification', emailVerification);

// ==========================================
// HELPER FUNCTIONS
// ==========================================

// Generate access token (short-lived)
function generateAccessToken(user) {
    return jwt.sign(
        { id: user.id, email: user.email, plan: user.plan || 'free' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: JWT_ACCESS_EXPIRY }
    );
}

// Generate refresh token (long-lived)
function generateRefreshToken() {
    return crypto.randomBytes(64).toString('hex');
}

// Generate password reset token
function generatePasswordResetToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Generate email verification token
function generateEmailVerificationToken() {
    return crypto.randomBytes(32).toString('hex');
}

// Hash token for storage
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}

// Database query helper (promise-based) with APM tracking
const db = {
    query: async (text, params) => {
        const startTime = Date.now();
        try {
            const result = await pool.query(text, params);
            const duration = Date.now() - startTime;
            // Track query performance (slow if > 500ms)
            apmService.trackDatabaseQuery(duration, duration > 500, false);
            return result;
        } catch (error) {
            const duration = Date.now() - startTime;
            apmService.trackDatabaseQuery(duration, false, true);
            throw error;
        }
    },
    getClient: () => pool.connect()
};

// ==========================================
// AUTH MIDDLEWARE
// ==========================================

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            if (err.name === 'TokenExpiredError') {
                return res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
            }
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Optional: Require email verification for certain actions
const requireEmailVerification = async (req, res, next) => {
    try {
        const result = await db.query('SELECT email_verified FROM users WHERE id = $1', [req.user.id]);
        if (!result.rows[0] || !result.rows[0].email_verified) {
            return res.status(403).json({ 
                error: 'Email verification required',
                code: 'EMAIL_NOT_VERIFIED'
            });
        }
        next();
    } catch (err) {
        return res.status(500).json({ error: 'Database error' });
    }
};

// ==========================================
// AUTH ROUTES
// ==========================================

// Register new user
app.post('/api/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
        .matches(/[0-9]/).withMessage('Password must contain a number')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        
        // Check if user exists
        const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existingUser.rows.length > 0) {
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

        await db.query(
            'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [user.id, refreshTokenHash, refreshExpiresAt]
        );

        // Phase 3: Cache user data in Redis
        await trackCacheOperation('set', async () => {
            return redisService.set(`user:${user.id}`, {
                id: user.id,
                email: user.email,
                plan: user.plan,
                email_verified: user.email_verified
            }, 3600); // Cache for 1 hour
        });

        versionedResponse(req, res, { 
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
        logger.error('Registration error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// Login
app.post('/api/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];
        const passwordValid = await bcrypt.compare(password, user.password_hash);

        if (!passwordValid) {
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

        // Phase 3: Cache user data in Redis
        await trackCacheOperation('set', async () => {
            return redisService.set(`user:${user.id}`, {
                id: user.id,
                email: user.email,
                plan: user.plan || 'free',
                email_verified: user.email_verified
            }, 3600);
        });

        versionedResponse(req, res, { 
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
        logger.error('Login error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Login failed. Please try again.' });
    }
});

// Refresh access token
app.post('/api/refresh', [
    body('refreshToken').exists().withMessage('Refresh token required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { refreshToken } = req.body;
    const tokenHash = hashToken(refreshToken);

    try {
        const result = await db.query(
            `SELECT rt.*, u.email, u.plan, u.email_verified 
             FROM refresh_tokens rt 
             JOIN users u ON rt.user_id = u.id 
             WHERE rt.token_hash = $1 AND rt.revoked_at IS NULL AND rt.expires_at > NOW()`,
            [tokenHash]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid or expired refresh token', code: 'REFRESH_TOKEN_INVALID' });
        }

        const tokenData = result.rows[0];
        const user = { 
            id: tokenData.user_id, 
            email: tokenData.email, 
            plan: tokenData.plan || 'free',
            emailVerified: tokenData.email_verified
        };

        const accessToken = generateAccessToken(user);

        versionedResponse(req, res, { 
            accessToken, 
            expiresIn: JWT_ACCESS_EXPIRY,
            user 
        });
    } catch (error) {
        logger.error('Refresh token error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Token refresh failed' });
    }
});

// Logout (revoke refresh token)
app.post('/api/logout', [
    body('refreshToken').exists()
], async (req, res) => {
    const { refreshToken } = req.body;
    const tokenHash = hashToken(refreshToken);

    try {
        await db.query(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1',
            [tokenHash]
        );
        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        logger.error('Logout error:', error);
        res.json({ message: 'Logged out successfully' }); // Don't fail on logout
    }
});

// Logout everywhere (revoke all refresh tokens)
app.post('/api/logout-all', authenticateToken, async (req, res) => {
    try {
        await db.query(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
            [req.user.id]
        );
        // Phase 3: Clear user cache on logout all
        await trackCacheOperation('delete', async () => {
            return redisService.del(`user:${req.user.id}`);
        });
        await trackCacheOperation('delete', async () => {
            return redisService.del(`user:${req.user.id}:full`);
        });

        res.json({ message: 'Logged out from all devices successfully' });
    } catch (error) {
        logger.error('Logout all error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Failed to logout from all devices' });
    }
});

// ==========================================
// EMAIL VERIFICATION ROUTES
// ==========================================

// Verify email
app.post('/api/verify-email', [
    body('token').exists().withMessage('Verification token required')
], async (req, res) => {
    const { token } = req.body;
    const tokenHash = hashToken(token);

    try {
        const result = await db.query(
            `SELECT evt.*, u.email, u.email_verified 
             FROM email_verification_tokens evt
             JOIN users u ON evt.user_id = u.id
             WHERE evt.token_hash = $1 AND evt.used_at IS NULL AND evt.expires_at > NOW()`,
            [tokenHash]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired verification token' });
        }

        const tokenData = result.rows[0];

        if (tokenData.email_verified) {
            return res.status(400).json({ error: 'Email already verified' });
        }

        // Mark token as used and verify email
        await db.query('BEGIN');
        await db.query(
            'UPDATE email_verification_tokens SET used_at = NOW() WHERE token_hash = $1',
            [tokenHash]
        );
        await db.query(
            'UPDATE users SET email_verified = TRUE, email_verified_at = NOW() WHERE id = $1',
            [tokenData.user_id]
        );
        await db.query('COMMIT');

        // Phase 3: Invalidate user cache after verification
        await trackCacheOperation('delete', async () => {
            return redisService.del(`user:${tokenData.user_id}`);
        });
        await trackCacheOperation('delete', async () => {
            return redisService.del(`user:${tokenData.user_id}:full`);
        });

        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        await db.query('ROLLBACK');
        logger.error('Email verification error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Email verification failed' });
    }
});

// Resend verification email
app.post('/api/resend-verification', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, email, email_verified FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        if (user.email_verified) {
            return res.status(400).json({ error: 'Email already verified' });
        }

        // Generate new verification token
        const verificationToken = generateEmailVerificationToken();
        const tokenHash = hashToken(verificationToken);
        const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY);

        await db.query(
            'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [user.id, tokenHash, expiresAt]
        );

        // Send verification email
        const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
        await emailService.sendVerificationEmail(user.email, verificationUrl);

        res.json({ message: 'Verification email sent successfully' });
    } catch (error) {
        logger.error('Resend verification error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Failed to send verification email' });
    }
});

// ==========================================
// PASSWORD RESET ROUTES
// ==========================================

// Request password reset
app.post('/api/password-reset', [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    const { email } = req.body;

    try {
        const result = await db.query('SELECT id, email FROM users WHERE email = $1', [email]);
        
        // Don't reveal if email exists (security best practice)
        if (result.rows.length === 0) {
            return res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
        }

        const user = result.rows[0];

        // Generate reset token
        const resetToken = generatePasswordResetToken();
        const tokenHash = hashToken(resetToken);
        const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRY);

        // Invalidate any existing reset tokens for this user
        await db.query(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
            [user.id]
        );

        // Create new reset token
        await db.query(
            'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
            [user.id, tokenHash, expiresAt]
        );

        // Send reset email
        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        await emailService.sendPasswordResetEmail(user.email, resetUrl);

        res.json({ message: 'If an account exists with this email, a password reset link has been sent.' });
    } catch (error) {
        logger.error('Password reset request error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Failed to process password reset request' });
    }
});

// Reset password with token
app.post('/api/password-reset/confirm', [
    body('token').exists().withMessage('Reset token required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
        .matches(/[0-9]/).withMessage('Password must contain a number')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { token, password } = req.body;
    const tokenHash = hashToken(token);

    try {
        const result = await db.query(
            `SELECT prt.*, u.id as user_id, u.email
             FROM password_reset_tokens prt
             JOIN users u ON prt.user_id = u.id
             WHERE prt.token_hash = $1 AND prt.used_at IS NULL AND prt.expires_at > NOW()`,
            [tokenHash]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired reset token' });
        }

        const tokenData = result.rows[0];
        const hashedPassword = await bcrypt.hash(password, 12);

        // Update password and mark token as used
        await db.query('BEGIN');
        await db.query(
            'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
            [hashedPassword, tokenData.user_id]
        );
        await db.query(
            'UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = $1',
            [tokenHash]
        );
        // Revoke all refresh tokens (force re-login)
        await db.query(
            'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL',
            [tokenData.user_id]
        );
        await db.query('COMMIT');

        // Phase 3: Clear user cache after password reset
        await trackCacheOperation('delete', async () => {
            return redisService.del(`user:${tokenData.user_id}`);
        });
        await trackCacheOperation('delete', async () => {
            return redisService.del(`user:${tokenData.user_id}:full`);
        });

        res.json({ message: 'Password reset successfully. Please login with your new password.' });
    } catch (error) {
        await db.query('ROLLBACK');
        logger.error('Password reset error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Password reset failed' });
    }
});

// ==========================================
// STRIPE PAYMENT ROUTES
// ==========================================

// Create checkout session
app.post('/api/create-checkout-session', authenticateToken, [
    body('plan').isIn(['professional', 'enterprise']).withMessage('Invalid plan'),
    body('priceId').exists().withMessage('Stripe price ID required')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { plan, priceId } = req.body;

    try {
        // Get or create Stripe customer
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

            // Store customer ID
            await db.query(
                'INSERT INTO stripe_subscriptions (user_id, stripe_customer_id, plan, status) VALUES ($1, $2, $3, $4) ON CONFLICT (stripe_customer_id) DO NOTHING',
                [req.user.id, customerId, plan, 'pending']
            );
        }

        // Create checkout session
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

        versionedResponse(req, res, { sessionId: session.id, url: session.url });
    } catch (error) {
        logger.error('Stripe checkout error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Failed to create checkout session' });
    }
});

// Stripe webhook handler
app.post('/api/webhooks/stripe', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
        logger.error('Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object;
                await handleCheckoutCompleted(session);
                break;

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted':
                const subscription = event.data.object;
                await handleSubscriptionChange(subscription);
                break;

            case 'invoice.payment_succeeded':
                const invoice = event.data.object;
                await handlePaymentSucceeded(invoice);
                break;

            case 'invoice.payment_failed':
                const failedInvoice = event.data.object;
                await handlePaymentFailed(failedInvoice);
                break;
        }

        res.json({ received: true });
    } catch (error) {
        logger.error('Webhook handler error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

// Webhook handlers
async function handleCheckoutCompleted(session) {
    const userId = parseInt(session.metadata.userId);
    const plan = session.metadata.plan;
    const subscriptionId = session.subscription;

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const customerId = subscription.customer;

    await db.query(
        `INSERT INTO stripe_subscriptions (user_id, stripe_customer_id, stripe_subscription_id, stripe_price_id, plan, status, current_period_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (stripe_subscription_id) 
         DO UPDATE SET plan = $5, status = $6, current_period_end = $7, updated_at = NOW()`,
        [
            userId,
            customerId,
            subscriptionId,
            subscription.items.data[0].price.id,
            plan,
            subscription.status,
            new Date(subscription.current_period_end * 1000)
        ]
    );

    // Update user plan
    await db.query('UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2', [plan, userId]);
    
    // Phase 3: Invalidate user cache after plan change
    await trackCacheOperation('delete', async () => {
        return redisService.del(`user:${userId}`);
    });
    await trackCacheOperation('delete', async () => {
        return redisService.del(`user:${userId}:full`);
    });
}

async function handleSubscriptionChange(subscription) {
    const customerId = subscription.customer;
    const status = subscription.status;
    const plan = subscription.metadata.plan || 'professional';

    await db.query(
        `UPDATE stripe_subscriptions 
         SET status = $1, current_period_end = $2, cancel_at_period_end = $3, updated_at = NOW()
         WHERE stripe_customer_id = $4`,
        [
            status,
            new Date(subscription.current_period_end * 1000),
            subscription.cancel_at_period_end,
            customerId
        ]
    );

    // Update user plan if cancelled
    if (status === 'canceled' || status === 'unpaid') {
        const subResult = await db.query(
            'SELECT user_id FROM stripe_subscriptions WHERE stripe_customer_id = $1',
            [customerId]
        );
        if (subResult.rows.length > 0) {
            await db.query('UPDATE users SET plan = $1, updated_at = NOW() WHERE id = $2', 
                ['free', subResult.rows[0].user_id]);
            
            // Phase 3: Invalidate user cache
            await trackCacheOperation('delete', async () => {
                return redisService.del(`user:${subResult.rows[0].user_id}`);
            });
            await trackCacheOperation('delete', async () => {
                return redisService.del(`user:${subResult.rows[0].user_id}:full`);
            });
        }
    }
}

async function handlePaymentSucceeded(invoice) {
    // Payment succeeded - subscription is active
    const customerId = invoice.customer;
    await db.query(
        'UPDATE stripe_subscriptions SET status = $1, updated_at = NOW() WHERE stripe_customer_id = $2',
        ['active', customerId]
    );
}

async function handlePaymentFailed(invoice) {
    // Payment failed - mark subscription as past_due
    const customerId = invoice.customer;
    await db.query(
        'UPDATE stripe_subscriptions SET status = $1, updated_at = NOW() WHERE stripe_customer_id = $2',
        ['past_due', customerId]
    );
}

// Get subscription status
app.get('/api/subscription', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT stripe_customer_id, stripe_subscription_id, plan, status, current_period_end, cancel_at_period_end
             FROM stripe_subscriptions WHERE user_id = $1`,
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.json({ subscription: null });
        }

        versionedResponse(req, res, { subscription: result.rows[0] });
    } catch (error) {
        logger.error('Get subscription error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Failed to fetch subscription' });
    }
});

// Cancel subscription
app.post('/api/cancel-subscription', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'SELECT stripe_subscription_id FROM stripe_subscriptions WHERE user_id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0 || !result.rows[0].stripe_subscription_id) {
            return res.status(404).json({ error: 'No active subscription found' });
        }

        const subscriptionId = result.rows[0].stripe_subscription_id;

        // Cancel at period end (don't cancel immediately)
        await stripe.subscriptions.update(subscriptionId, {
            cancel_at_period_end: true
        });

        await db.query(
            'UPDATE stripe_subscriptions SET cancel_at_period_end = TRUE, updated_at = NOW() WHERE user_id = $1',
            [req.user.id]
        );

        res.json({ message: 'Subscription will be cancelled at the end of the billing period' });
    } catch (error) {
        logger.error('Cancel subscription error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Failed to cancel subscription' });
    }
});

// ==========================================
// USER ROUTES
// ==========================================

// Get current user info (with Redis caching)
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        // Phase 3: Try to get from cache first
        const cacheKey = `user:${req.user.id}:full`;
        const cachedUser = await trackCacheOperation('get', async () => {
            return redisService.get(cacheKey);
        });

        if (cachedUser) {
            logger.debug(`Cache hit for user ${req.user.id}`);
            return versionedResponse(req, res, cachedUser);
        }

        logger.debug(`Cache miss for user ${req.user.id}, fetching from database`);

        const result = await db.query(
            'SELECT id, email, plan, email_verified, created_at FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = result.rows[0];

        // Get application count
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

        const userData = {
            ...user,
            applicationCount: count,
            applicationLimit: limit,
            canAddMore: plan !== 'free' || count < FREE_TIER_LIMIT
        };

        // Phase 3: Cache user data for 5 minutes
        await trackCacheOperation('set', async () => {
            return redisService.set(cacheKey, userData, 300);
        });

        versionedResponse(req, res, userData);
    } catch (error) {
        logger.error('Get user error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Failed to fetch user' });
    }
});

// ==========================================
// APPLICATION ROUTES (with pagination)
// ==========================================

// Get all applications (with pagination)
app.get('/api/applications', authenticateToken, async (req, res) => {
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
        
        versionedResponse(req, res, {
            applications: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('Get applications error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Database error' });
    }
});

// Create application (with free tier enforcement)
app.post('/api/applications', authenticateToken, [
    body('company').notEmpty().trim().escape(),
    body('role').notEmpty().trim().escape(),
    body('stage').isIn(['applied', 'interview', 'offer', 'rejected', 'ghosted'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        // Check free tier limit
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
            return res.status(403).json({ 
                error: 'Free tier limit reached',
                code: 'LIMIT_REACHED',
                message: `You've reached the free limit of ${FREE_TIER_LIMIT} applications. Upgrade to Professional for unlimited applications.`,
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

        // Phase 3: Invalidate user cache when application is created
        await trackCacheOperation('delete', async () => {
            return redisService.del(`user:${req.user.id}:full`);
        });

        res.status(201).json({ 
            id: result.rows[0].id, 
            message: 'Application created successfully',
            remainingSlots: plan === 'free' ? FREE_TIER_LIMIT - count - 1 : Infinity
        });
    } catch (error) {
        logger.error('Create application error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Failed to create application' });
    }
});

// Update application
app.put('/api/applications/:id', authenticateToken, [
    body('stage').optional().isIn(['applied', 'interview', 'offer', 'rejected', 'ghosted'])
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

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
            return res.status(404).json({ error: 'Application not found' });
        }

        res.json({ message: 'Application updated successfully' });
    } catch (error) {
        logger.error('Update application error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Failed to update application' });
    }
});

// Soft delete application
app.delete('/api/applications/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(
            'UPDATE applications SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING id',
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }

        // Phase 3: Invalidate user cache when application is deleted
        await trackCacheOperation('delete', async () => {
            return redisService.del(`user:${req.user.id}:full`);
        });

        res.json({ message: 'Application deleted successfully' });
    } catch (error) {
        logger.error('Delete application error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Failed to delete application' });
    }
});

// Restore deleted application
app.post('/api/applications/:id/restore', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query(
            'UPDATE applications SET deleted_at = NULL, updated_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NOT NULL RETURNING id',
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Deleted application not found' });
        }

        // Phase 3: Invalidate user cache when application is restored
        await trackCacheOperation('delete', async () => {
            return redisService.del(`user:${req.user.id}:full`);
        });

        res.json({ message: 'Application restored successfully' });
    } catch (error) {
        logger.error('Restore application error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Failed to restore application' });
    }
});

// ==========================================
// ANALYTICS ROUTES (with pagination)
// ==========================================

app.get('/api/analytics', authenticateToken, async (req, res) => {
    const userId = req.user.id;

    try {
        // Get stage counts
        const stageResult = await db.query(
            'SELECT stage, COUNT(*) as count FROM applications WHERE user_id = $1 AND deleted_at IS NULL GROUP BY stage',
            [userId]
        );

        // Get monthly application counts (PostgreSQL date formatting)
        const monthlyResult = await db.query(
            `SELECT TO_CHAR(date_applied, 'YYYY-MM') as month, COUNT(*) as count 
             FROM applications 
             WHERE user_id = $1 AND deleted_at IS NULL 
             GROUP BY month ORDER BY month DESC LIMIT 12`,
            [userId]
        );

        // Get source breakdown
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

        // Calculate rates
        if (analytics.total > 0) {
            analytics.rates.interview = Math.round(((analytics.stages.interview || 0) / analytics.total) * 100);
            analytics.rates.offer = Math.round(((analytics.stages.offer || 0) / analytics.total) * 100);
            analytics.rates.rejection = Math.round(((analytics.stages.rejected || 0) / analytics.total) * 100);
            analytics.rates.ghosted = Math.round(((analytics.stages.ghosted || 0) / analytics.total) * 100);
            analytics.rates.response = 100 - analytics.rates.ghosted;
        }

        versionedResponse(req, res, analytics);
    } catch (error) {
        logger.error('Analytics error:', error);
        apmService.trackError(error, req.originalUrl);
        res.status(500).json({ error: 'Database error' });
    }
});

// ==========================================
// HEALTH & UTILITY ROUTES
// ==========================================

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        
        const health = {
            status: 'OK', 
            timestamp: new Date().toISOString(),
            version: '4.0.0',
            features: [
                'postgresql', 
                'stripe', 
                'email-verification', 
                'password-reset', 
                'pagination', 
                'jwt-refresh', 
                'free-tier-limits',
                'redis-caching',
                'per-user-rate-limiting',
                'api-versioning',
                'winston-logging',
                'apm-monitoring'
            ],
            services: {
                database: 'connected',
                redis: redisService.isAvailable() ? 'connected' : 'disconnected',
                apm: 'active'
            },
            metrics: apmService.getMetrics()
        };
        
        res.json(health);
    } catch (error) {
        logger.error('Health check error:', error);
        res.status(503).json({ 
            status: 'ERROR', 
            error: 'Database connection failed',
            timestamp: new Date().toISOString()
        });
    }
});

// API info
app.get('/api', (req, res) => {
    res.json({
        name: 'Smart Job Tracker API',
        version: '4.0.0',
        supportedVersions: [1, 2, 3],
        currentVersion: req.apiVersion || 3,
        endpoints: {
            auth: ['POST /api/register', 'POST /api/login', 'POST /api/refresh', 'POST /api/logout'],
            verification: ['POST /api/verify-email', 'POST /api/resend-verification'],
            password: ['POST /api/password-reset', 'POST /api/password-reset/confirm'],
            stripe: ['POST /api/create-checkout-session', 'GET /api/subscription', 'POST /api/cancel-subscription'],
            user: ['GET /api/me'],
            applications: ['GET /api/applications', 'POST /api/applications', 'PUT /api/applications/:id', 'DELETE /api/applications/:id'],
            analytics: ['GET /api/analytics'],
            health: ['GET /api/health'],
            metrics: ['GET /api/metrics']
        },
        features: {
            caching: 'Redis',
            rateLimiting: 'Per-user (Redis-backed)',
            logging: 'Winston',
            monitoring: 'APM',
            versioning: 'Header or URL-based'
        }
    });
});

// Phase 3: APM Metrics endpoint
app.get('/api/metrics', authenticateToken, (req, res) => {
    versionedResponse(req, res, apmService.getMetrics());
});

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    apmService.trackError(err, req.originalUrl || req.url);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
});

// ==========================================
// SERVER STARTUP & GRACEFUL SHUTDOWN
// ==========================================

const server = app.listen(PORT, () => {
    logger.info(`\n🚀 Smart Job Tracker API v4.0.0`);
    logger.info(`   Server running on port ${PORT}`);
    logger.info(`   Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`   Database: PostgreSQL`);
    logger.info(`   Redis: ${redisService.isAvailable() ? 'Connected' : 'Not available'}`);
    logger.info(`   Logging: Winston`);
    logger.info(`   APM: Active`);
    logger.info(`   Health check: http://localhost:${PORT}/api/health\n`);
});

// Graceful shutdown handler
async function gracefulShutdown(signal) {
    logger.info(`\n${signal} received. Starting graceful shutdown...`);
    
    // Log final APM metrics
    apmService.logMetrics();
    
    server.close(async () => {
        logger.info('✅ HTTP server closed');
        
        // Phase 3: Close Redis connection
        if (redisService.isAvailable()) {
            await redisService.close();
            logger.info('✅ Redis connection closed');
        }
        
        // Close database connection pool
        pool.end((err) => {
            if (err) {
                logger.error('❌ Error closing database pool:', err);
                process.exit(1);
            }
            logger.info('✅ Database connection pool closed');
            logger.info('👋 Graceful shutdown complete');
            process.exit(0);
        });
    });

    // Force close after 10 seconds
    setTimeout(() => {
        logger.error('⚠️  Forcing shutdown after timeout');
        process.exit(1);
    }, 10000);
}

// Listen for shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    apmService.trackError(err);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
    apmService.trackError(new Error(`Unhandled Rejection: ${reason}`));
});

module.exports = app;
