# 🚀 Quick Start Guide

## For Immediate Launch

### 1. Install Node.js
```bash
# macOS
brew install node

# Verify
node --version  # Should be v18+
```

### 2. Install Dependencies
```bash
cd backend
npm install
```

### 3. Update Production Domain
Edit `backend/.env`:
```
CORS_ORIGINS=https://yourdomain.com
```

### 4. Start Server
```bash
# Option A: PM2 (recommended)
npm install -g pm2
./start-production.sh

# Option B: Direct
cd backend
npm start
```

### 5. Deploy Frontend
- Upload HTML/CSS/JS files to Netlify, Vercel, or GitHub Pages
- No build step required!

## Health Check
Visit: `http://localhost:3001/api/health`

## Full Documentation
- `DEPLOYMENT_GUIDE.md` - Complete deployment instructions
- `LAUNCH_READINESS.md` - Launch checklist
- `README.md` - Project overview
