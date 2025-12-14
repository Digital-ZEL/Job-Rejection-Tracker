/**
 * Database Migration Script
 * Migrates from SQLite to PostgreSQL or initializes PostgreSQL schema
 * 
 * Usage: node scripts/migrate.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function runMigrations() {
    const client = await pool.connect();
    
    try {
        console.log('🔄 Starting database migration...\n');

        await client.query('BEGIN');

        // Create migrations table to track migration history
        await client.query(`
            CREATE TABLE IF NOT EXISTS migrations (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Migration 1: Create all tables
        const migration1 = '001_initial_schema';
        const existing1 = await client.query('SELECT * FROM migrations WHERE name = $1', [migration1]);
        
        if (existing1.rows.length === 0) {
            console.log('📋 Running migration: Initial schema...');

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
            console.log('📊 Creating indexes...');
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

            await client.query('INSERT INTO migrations (name) VALUES ($1)', [migration1]);
            console.log('✅ Migration 1 completed: Initial schema\n');
        } else {
            console.log('⏭️  Migration 1 already executed: Initial schema\n');
        }

        await client.query('COMMIT');
        console.log('✅ All migrations completed successfully!\n');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run migrations
runMigrations()
    .then(() => {
        console.log('👋 Migration script finished');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
