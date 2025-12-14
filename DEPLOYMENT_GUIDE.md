# 🚀 Production Deployment Guide

This guide will help you deploy the Job Rejection Tracker to production.

## 📋 Pre-Deployment Checklist

- [x] Production `.env` file created with secure JWT_SECRET
- [x] CORS configured for production domains
- [x] `.gitignore` updated to exclude sensitive files
- [x] Docker configuration files created
- [x] PM2 process manager configuration created
- [ ] Node.js installed (v18 or higher)
- [ ] Dependencies installed
- [ ] Database initialized
- [ ] Production domain configured

## 🔧 Step 1: Install Node.js

If Node.js is not installed:

1. **macOS/Linux**: Download from [nodejs.org](https://nodejs.org/) or use a package manager:
   ```bash
   # Using Homebrew (macOS)
   brew install node
   
   # Using apt (Ubuntu/Debian)
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

2. **Verify installation**:
   ```bash
   node --version  # Should be v18.x or higher
   npm --version   # Should be 9.x or higher
   ```

## 📦 Step 2: Install Dependencies

### Backend Dependencies
```bash
cd backend
npm install
```

### Frontend Dependencies (optional, for testing)
```bash
cd ..
npm install
```

## 🔐 Step 3: Configure Production Environment

1. **Update `.env` file** in `backend/.env`:
   ```bash
   # Update CORS_ORIGINS with your production domain
   CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   
   # Ensure NODE_ENV is set to production
   NODE_ENV=production
   ```

2. **Verify JWT_SECRET** is set to a secure random string (already configured)

## 🗄️ Step 4: Initialize Database

The database will be created automatically on first server start. The SQLite database file will be created at `backend/job_tracker.db`.

**Important**: For production with high traffic, consider migrating to PostgreSQL:
- Create a PostgreSQL database
- Update database connection in `server.js`
- Run migrations

## 🚀 Step 5: Choose Deployment Method

### Option A: PM2 Process Manager (Recommended for VPS)

1. **Install PM2 globally**:
   ```bash
   npm install -g pm2
   ```

2. **Start the application**:
   ```bash
   pm2 start ecosystem.config.js
   ```

3. **Save PM2 configuration**:
   ```bash
   pm2 save
   pm2 startup  # Follow instructions to enable auto-start on reboot
   ```

4. **Monitor**:
   ```bash
   pm2 monit
   pm2 logs
   ```

### Option B: Docker (Recommended for Cloud Platforms)

1. **Build the Docker image**:
   ```bash
   docker build -t job-tracker .
   ```

2. **Run with Docker Compose**:
   ```bash
   docker-compose up -d
   ```

3. **Or run directly**:
   ```bash
   docker run -d \
     -p 3001:3001 \
     --env-file backend/.env \
     -v $(pwd)/backend/job_tracker.db:/app/backend/job_tracker.db \
     --name job-tracker \
     job-tracker
   ```

### Option C: Direct Node.js (Development/Testing)

```bash
cd backend
npm start
```

## 🌐 Step 6: Deploy Frontend

### Option 1: Static Hosting (Recommended)

The frontend is a static site that can be hosted on:

- **Netlify**: Drag and drop the project folder
- **Vercel**: `vercel deploy`
- **GitHub Pages**: Push to `gh-pages` branch
- **AWS S3 + CloudFront**: Upload files to S3 bucket

**No build step required** - just upload the HTML/CSS/JS files.

### Option 2: Serve with Backend

Update `server.js` to serve static files:

```javascript
app.use(express.static('public')); // Serve frontend files
```

## 🔒 Step 7: Security Hardening

1. **Update CORS origins** in `.env` to only allow your production domain
2. **Enable HTTPS** using a reverse proxy (nginx/Apache) or cloud provider
3. **Set up firewall rules** to only allow necessary ports
4. **Regular backups** of `job_tracker.db`
5. **Monitor logs** for suspicious activity

## 🔄 Step 8: Reverse Proxy Setup (nginx)

Example nginx configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Step 9: Monitoring & Maintenance

### Health Checks
- Endpoint: `http://yourdomain.com/api/health`
- Set up monitoring (UptimeRobot, Pingdom, etc.)

### Logs
- PM2: `pm2 logs`
- Docker: `docker logs job-tracker`
- Direct: Check console output

### Backups
```bash
# Backup database
cp backend/job_tracker.db backups/job_tracker_$(date +%Y%m%d).db
```

## 🎯 Platform-Specific Guides

### Heroku
```bash
heroku create your-app-name
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret-key
git push heroku main
```

### AWS EC2
1. Launch EC2 instance
2. Install Node.js
3. Clone repository
4. Configure security groups (port 3001)
5. Use PM2 or Docker

### DigitalOcean App Platform
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

### Railway
1. Connect GitHub repository
2. Set environment variables
3. Deploy automatically

## ✅ Post-Deployment Verification

1. **Health Check**: Visit `https://yourdomain.com/api/health`
2. **Test Registration**: Create a test user account
3. **Test API**: Verify all endpoints work
4. **Frontend**: Ensure frontend can connect to backend
5. **SSL**: Verify HTTPS is working

## 🆘 Troubleshooting

### Port Already in Use
```bash
# Find process using port 3001
lsof -i :3001
# Kill process
kill -9 <PID>
```

### Database Locked
```bash
# Check file permissions
ls -la backend/job_tracker.db
# Fix permissions if needed
chmod 644 backend/job_tracker.db
```

### CORS Errors
- Verify `CORS_ORIGINS` in `.env` includes your frontend domain
- Check browser console for specific error messages

### JWT Errors
- Verify `JWT_SECRET` is set in `.env`
- Ensure secret is the same across all instances

## 📞 Support

For issues or questions:
- Check the main README.md
- Review SETUP_INSTRUCTIONS.md
- Check GitHub issues

---

**Your application is now ready for production! 🎉**
