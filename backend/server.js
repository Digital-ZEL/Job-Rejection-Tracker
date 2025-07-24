const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Ensure JWT_SECRET is set
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'your-secret-key') {
    console.warn('WARNING: Using default JWT secret. Please set JWT_SECRET in production environment.');
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Database setup
const db = new sqlite3.Database('job_tracker.db');

// Initialize database
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Applications table
    db.run(`CREATE TABLE IF NOT EXISTS applications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        company TEXT NOT NULL,
        role TEXT NOT NULL,
        location TEXT,
        source TEXT,
        stage TEXT NOT NULL DEFAULT 'applied',
        notes TEXT,
        salary_min INTEGER,
        salary_max INTEGER,
        date_applied DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);

    // Interviews table
    db.run(`CREATE TABLE IF NOT EXISTS interviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        application_id INTEGER NOT NULL,
        interview_type TEXT NOT NULL,
        scheduled_date DATETIME,
        notes TEXT,
        outcome TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (application_id) REFERENCES applications (id)
    )`);
});

// Auth middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Auth routes
app.post('/api/register', [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        db.run('INSERT INTO users (email, password_hash) VALUES (?, ?)', 
            [email, hashedPassword], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    return res.status(400).json({ error: 'Email already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }

            const token = jwt.sign({ id: this.lastID, email }, 
                process.env.JWT_SECRET || 'your-secret-key');
            res.json({ token, user: { id: this.lastID, email } });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/login', [
    body('email').isEmail().normalizeEmail(),
    body('password').exists()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user || !await bcrypt.compare(password, user.password_hash)) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, 
            process.env.JWT_SECRET || 'your-secret-key');
        res.json({ token, user: { id: user.id, email: user.email } });
    });
});

// Application routes
app.get('/api/applications', authenticateToken, (req, res) => {
    const { stage, search } = req.query;
    let query = 'SELECT * FROM applications WHERE user_id = ?';
    let params = [req.user.id];

    if (stage) {
        query += ' AND stage = ?';
        params.push(stage);
    }

    if (search) {
        query += ' AND (company LIKE ? OR role LIKE ?)';
        params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(rows);
    });
});

app.post('/api/applications', authenticateToken, [
    body('company').notEmpty(),
    body('role').notEmpty(),
    body('stage').isIn(['applied', 'interview', 'offer', 'rejected', 'ghosted'])
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { company, role, location, source, stage, notes, salary_min, salary_max } = req.body;

    db.run(`INSERT INTO applications (user_id, company, role, location, source, stage, notes, salary_min, salary_max) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [req.user.id, company, role, location, source, stage, notes, salary_min, salary_max],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ id: this.lastID, message: 'Application created successfully' });
        });
});

app.put('/api/applications/:id', authenticateToken, [
    body('stage').optional().isIn(['applied', 'interview', 'offer', 'rejected', 'ghosted'])
], (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { company, role, location, source, stage, notes, salary_min, salary_max } = req.body;

    db.run(`UPDATE applications SET company = ?, role = ?, location = ?, source = ?, stage = ?, 
            notes = ?, salary_min = ?, salary_max = ?, updated_at = CURRENT_TIMESTAMP 
            WHERE id = ? AND user_id = ?`,
        [company, role, location, source, stage, notes, salary_min, salary_max, id, req.user.id],
        function(err) {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Application not found' });
            }
            res.json({ message: 'Application updated successfully' });
        });
});

app.delete('/api/applications/:id', authenticateToken, (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM applications WHERE id = ? AND user_id = ?', [id, req.user.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Application not found' });
        }
        res.json({ message: 'Application deleted successfully' });
    });
});

// Analytics routes
app.get('/api/analytics', authenticateToken, (req, res) => {
    const userId = req.user.id;

    db.all(`SELECT stage, COUNT(*) as count FROM applications WHERE user_id = ? GROUP BY stage`, 
        [userId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        const analytics = {
            total: 0,
            stages: {},
            successRate: 0
        };

        rows.forEach(row => {
            analytics.stages[row.stage] = row.count;
            analytics.total += row.count;
        });

        analytics.successRate = analytics.stages.offer ? 
            Math.round((analytics.stages.offer / analytics.total) * 100) : 0;

        res.json(analytics);
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
