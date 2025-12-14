# Backend Security Hardening - Changelog

## Version 2.0.0 (Security Hardening Release)

This release addresses critical security vulnerabilities and adds production-ready features.

---

## 🔐 Security Fixes

### 1. JWT Token Expiration
**Before:** Tokens never expired (permanent access if stolen)
**After:** 
- Access tokens expire in **15 minutes**
- Refresh tokens expire in **7 days**

### 2. Refresh Token System
**New Feature:** Complete refresh token implementation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/refresh` | POST | Exchange refresh token for new access token |
| `/api/logout` | POST | Revoke refresh token |
| `/api/logout-all` | POST | Revoke ALL user's refresh tokens (logout everywhere) |

**How it works:**
```
1. User logs in → receives accessToken + refreshToken
2. accessToken expires in 15 minutes
3. Frontend calls /api/refresh with refreshToken
4. Server returns new accessToken
5. Repeat until refreshToken expires (7 days)
```

### 3. Free Tier Enforcement
**New Feature:** Server-side limit of 5 applications for free users

```json
// Response when limit reached (403 Forbidden)
{
  "error": "Free tier limit reached",
  "code": "LIMIT_REACHED",
  "message": "You've reached the free limit of 5 applications...",
  "currentCount": 5,
  "limit": 5,
  "plan": "free"
}
```

### 4. Database Indexes
**New:** 7 indexes added for performance

| Index | Table | Columns |
|-------|-------|---------|
| `idx_users_email` | users | email |
| `idx_applications_user_id` | applications | user_id |
| `idx_applications_user_stage` | applications | user_id, stage |
| `idx_applications_search` | applications | company, role |
| `idx_applications_deleted` | applications | deleted_at |
| `idx_refresh_tokens_user` | refresh_tokens | user_id |
| `idx_refresh_tokens_hash` | refresh_tokens | token_hash |

### 5. Graceful Shutdown
**New:** Server properly closes connections on SIGTERM/SIGINT

```javascript
// What happens on shutdown:
1. Stop accepting new connections
2. Wait for existing requests to complete
3. Close database connection
4. Exit cleanly
```

---

## 🆕 New Features

### Soft Deletes
Applications are no longer permanently deleted. They're marked with `deleted_at` timestamp.

| Endpoint | Method | Description |
|----------|--------|-------------|
| `DELETE /api/applications/:id` | DELETE | Soft delete (sets deleted_at) |
| `POST /api/applications/:id/restore` | POST | Restore deleted application |

### Pagination
All list endpoints now support pagination:

```
GET /api/applications?page=1&limit=20
```

Response:
```json
{
  "applications": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

### User Info Endpoint
```
GET /api/me
```

Response:
```json
{
  "id": 1,
  "email": "user@example.com",
  "plan": "free",
  "applicationCount": 3,
  "applicationLimit": 5,
  "canAddMore": true
}
```

### Enhanced Analytics
`GET /api/analytics` now returns:
- Stage counts
- Monthly application counts (last 12 months)
- Source breakdown
- Success rates (interview, offer, rejection, response)

---

## 🔧 Configuration Changes

### New Environment Variables

```env
# .env file
PORT=3001
NODE_ENV=production
JWT_SECRET=your-256-bit-secret-here
DB_PATH=./job_tracker.db
CORS_ORIGINS=https://yourdomain.com
```

### Password Requirements (Stricter)
- Minimum 8 characters (was 6)
- Must contain uppercase letter
- Must contain number

### bcrypt Cost Factor
- Increased from 10 to 12 (more secure hashing)

---

## 📊 Database Schema Changes

### New Table: `refresh_tokens`
```sql
CREATE TABLE refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

### Modified Table: `users`
```sql
-- Added column
plan TEXT DEFAULT 'free'
```

### Modified Table: `applications`
```sql
-- Added column
deleted_at DATETIME DEFAULT NULL
```

---

## 🚀 API Reference (v2.0.0)

### Authentication
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/register` | POST | No | Create account |
| `/api/login` | POST | No | Get tokens |
| `/api/refresh` | POST | No | Refresh access token |
| `/api/logout` | POST | No | Revoke refresh token |
| `/api/logout-all` | POST | Yes | Revoke all tokens |

### User
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/me` | GET | Yes | Get current user info |
| `/api/upgrade` | POST | Yes | Upgrade plan (Stripe TBD) |

### Applications
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/applications` | GET | Yes | List applications |
| `/api/applications` | POST | Yes | Create application |
| `/api/applications/:id` | PUT | Yes | Update application |
| `/api/applications/:id` | DELETE | Yes | Soft delete |
| `/api/applications/:id/restore` | POST | Yes | Restore deleted |

### Analytics
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/analytics` | GET | Yes | Get analytics |

### System
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | No | Health check |
| `/api` | GET | No | API info |

---

## 🔄 Migration Guide

If you have an existing database, run these SQL commands:

```sql
-- Add plan column to users
ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free';

-- Add deleted_at column to applications
ALTER TABLE applications ADD COLUMN deleted_at DATETIME DEFAULT NULL;

-- Create refresh_tokens table
CREATE TABLE refresh_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    revoked_at DATETIME DEFAULT NULL,
    FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_applications_user_id ON applications(user_id);
CREATE INDEX IF NOT EXISTS idx_applications_user_stage ON applications(user_id, stage);
CREATE INDEX IF NOT EXISTS idx_applications_search ON applications(company, role);
CREATE INDEX IF NOT EXISTS idx_applications_deleted ON applications(deleted_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
```

---

## ✅ Testing the Changes

### Test Health Check
```bash
curl http://localhost:3001/api/health
```

### Test Registration
```bash
curl -X POST http://localhost:3001/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'
```

### Test Token Refresh
```bash
curl -X POST http://localhost:3001/api/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"your-refresh-token-here"}'
```

---

## 🔜 Next Steps (Phase 2)

1. **Stripe Integration** - Payment processing for upgrades
2. **PostgreSQL Migration** - Replace SQLite for production
3. **Email Verification** - Confirm email addresses
4. **Password Reset** - Forgot password flow
5. **Rate Limiting by User** - Per-user instead of per-IP

---

*Updated: December 2024*
*Version: 2.0.0*
