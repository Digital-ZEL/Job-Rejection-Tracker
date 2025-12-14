# Phase 3 Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

This installs:
- `redis` - Redis client for caching
- `winston` - Structured logging framework

### 2. Set Up Redis

#### Option A: Local Redis (Development)

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux:**
```bash
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

**Windows:**
- Download from [redis.io/download](https://redis.io/download)
- Or use WSL2 with Linux instructions

**Verify Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

#### Option B: Cloud Redis (Production)

**Redis Cloud (Free tier):**
1. Sign up at [redis.com/try-free](https://redis.com/try-free)
2. Create database
3. Copy connection URL
4. Add to `.env`: `REDIS_URL=redis://...`

**Other Options:**
- **AWS ElastiCache** - Managed Redis
- **Railway** - Easy Redis setup
- **Heroku Redis** - Add-on for Heroku apps

### 3. Configure Environment Variables

Update `backend/.env`:

```env
# Redis
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=true

# Logging
LOG_LEVEL=info          # Use 'debug' for development
LOG_DIR=./logs          # Log file directory
```

### 4. Update Server File

**Option A: Use New Server (Recommended)**

```bash
# Backup current server
cp server.js server-v2-backup.js

# Use Phase 3 server
cp server-v3.js server.js
```

**Option B: Test Both (Gradual Migration)**

Keep both files and test `server-v3.js`:
```bash
# Test new server on different port
PORT=3002 node server-v3.js
```

### 5. Create Logs Directory

```bash
mkdir -p logs
```

Or let the server create it automatically (it will on first run).

### 6. Start Server

```bash
npm run dev
```

You should see:
```
✅ Redis connected and ready
✅ Winston logger initialized
🚀 Smart Job Tracker API v4.0.0
   Server running on port 3001
   Redis: Connected
```

---

## Testing

### Test Redis Connection

```bash
# In another terminal
redis-cli
> GET "test"
> SET "test" "hello"
> GET "test"
> DEL "test"
```

### Test Health Endpoint

```bash
curl http://localhost:3001/api/health
```

Should return:
```json
{
  "status": "OK",
  "services": {
    "database": "OK",
    "redis": "OK"
  }
}
```

### Test Metrics

```bash
curl http://localhost:3001/api/metrics
```

Returns comprehensive metrics including:
- Request counts
- Response times
- Database performance
- Cache hit rates

### Test API Versioning

```bash
# v1 endpoint
curl http://localhost:3001/api/v1/health

# Legacy endpoint (redirects to v1)
curl http://localhost:3001/api/health
```

### Test Rate Limiting

```bash
# Make 101 requests quickly
for i in {1..101}; do
  curl http://localhost:3001/api/v1/user/me \
    -H "Authorization: Bearer YOUR_TOKEN"
done

# Should get 429 (Too Many Requests) on 101st request
```

---

## Logging

### View Logs

**Development (Console):**
- Logs appear in terminal with colors
- All levels shown (based on `LOG_LEVEL`)

**Production (Files):**
```bash
# All logs
tail -f logs/combined.log

# Errors only
tail -f logs/error.log

# HTTP requests
tail -f logs/http.log
```

### Log Levels

Set in `.env`:
```env
LOG_LEVEL=debug   # Development: see everything
LOG_LEVEL=info    # Production: standard logging
LOG_LEVEL=warn    # Only warnings and errors
LOG_LEVEL=error   # Only errors
```

### Log Format

**Development:** Colorized, human-readable
```
2024-12-01 10:00:00 INFO: Server running on port 3001
```

**Production:** JSON format (for log aggregation)
```json
{
  "timestamp": "2024-12-01T10:00:00.000Z",
  "level": "info",
  "message": "Server running on port 3001"
}
```

---

## Monitoring

### APM Metrics

Access metrics dashboard:
```bash
curl http://localhost:3001/api/metrics
```

**Key Metrics:**
- **Request Count** - Total requests, by endpoint
- **Response Times** - Average, P95, P99
- **Error Rate** - Percentage of failed requests
- **Database** - Query count, slow queries, errors
- **Cache** - Hit rate, miss rate

### APM Health

```bash
curl http://localhost:3001/api/apm/health
```

Returns:
- `healthy` - All metrics OK
- `degraded` - Some issues detected

### Monitoring in Production

**Recommended Tools:**
- **Grafana** - Visualize metrics
- **Prometheus** - Metrics collection
- **Datadog** - Full APM solution
- **New Relic** - Application monitoring

**Export Metrics:**
- Metrics endpoint returns JSON
- Can be scraped by monitoring tools
- Update every 5 minutes automatically

---

## Troubleshooting

### Redis Not Connecting

**Error:** `Redis connection error`

**Check:**
1. Redis is running: `redis-cli ping`
2. `REDIS_URL` is correct in `.env`
3. Firewall allows Redis port (6379)
4. Network connectivity

**Fallback:**
- System works without Redis (database-only mode)
- Performance degrades but functionality intact

### Logs Not Appearing

**Issue:** No log files created

**Solutions:**
1. Check `LOG_DIR` exists and is writable
2. Verify `LOG_LEVEL` is set correctly
3. Check file permissions: `chmod 755 logs`

### High Memory Usage

**Issue:** Redis using too much memory

**Solutions:**
1. Set Redis maxmemory: `redis-cli CONFIG SET maxmemory 256mb`
2. Enable eviction: `redis-cli CONFIG SET maxmemory-policy allkeys-lru`
3. Monitor: `redis-cli INFO memory`

### Rate Limiting Too Strict

**Issue:** Getting 429 errors too often

**Solutions:**
1. Adjust limits in `middleware/rateLimiter.js`
2. Check if Redis is working (fallback may be stricter)
3. Verify you're authenticated (per-user limits are higher)

### Metrics Not Updating

**Issue:** Metrics show old data

**Solutions:**
1. Check APM service started: Look for "APM monitoring started" in logs
2. Make some requests to generate metrics
3. Metrics update every 5 minutes or on endpoint access

---

## Production Checklist

Before deploying to production:

- [ ] Redis configured (cloud or managed)
- [ ] `REDIS_URL` set to production Redis
- [ ] `LOG_LEVEL=info` (not debug)
- [ ] `LOG_DIR` points to persistent storage
- [ ] Log rotation configured (logrotate)
- [ ] Metrics endpoint secured (add auth if needed)
- [ ] Redis password set (if using cloud Redis)
- [ ] Redis persistence enabled (if needed)
- [ ] Monitoring tools configured
- [ ] Alerts set up for error rates

---

## Performance Tuning

### Redis Optimization

```bash
# Set max memory
redis-cli CONFIG SET maxmemory 512mb

# Enable eviction policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Enable persistence (optional)
redis-cli CONFIG SET save "900 1 300 10 60 10000"
```

### Logging Optimization

**Reduce log verbosity:**
```env
LOG_LEVEL=warn  # Only warnings and errors
```

**Limit log file size:**
- Already configured: 5MB max, 5 files
- Adjust in `services/logger.js` if needed

### Rate Limiting Tuning

Adjust in `middleware/rateLimiter.js`:
```javascript
general: createRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 200,  // Increase for higher traffic
})
```

---

## Support

For issues:
1. Check logs: `logs/error.log`
2. Check Redis: `redis-cli ping`
3. Check health: `curl /api/health`
4. Check metrics: `curl /api/metrics`

---

*Last updated: December 2024*
