# 🚀 Deploy Now - Step by Step

## Quick Deploy (Automated Scripts)

I've created automated deployment scripts for you! Follow these steps:

---

## Step 1: Deploy Backend to Railway

### Option A: Using the Script (Easiest)

```bash
cd /Users/dennyt8/Job-Rejection-Tracker
chmod +x deploy-railway.sh
./deploy-railway.sh
```

The script will:
- Install Railway CLI if needed
- Guide you through login
- Help you add PostgreSQL and Redis
- Set all environment variables
- Deploy your backend

### Option B: Manual Railway Setup

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login:**
   ```bash
   railway login
   ```

3. **Initialize Project:**
   ```bash
   cd backend
   railway init
   ```

4. **Add Services in Railway Dashboard:**
   - Go to [railway.app](https://railway.app)
   - Click your project
   - Add **PostgreSQL** database
   - Add **Redis** database
   - Copy the connection URLs

5. **Set Environment Variables:**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set DATABASE_URL=<postgres-url>
   railway variables set REDIS_URL=<redis-url>
   railway variables set JWT_SECRET=$(openssl rand -hex 64)
   railway variables set STRIPE_SECRET_KEY=sk_test_<your-key>
   railway variables set STRIPE_WEBHOOK_SECRET=whsec_<your-secret>
   railway variables set SMTP_HOST=smtp.gmail.com
   railway variables set SMTP_PORT=587
   railway variables set SMTP_USER=your-email@gmail.com
   railway variables set SMTP_PASS=<your-app-password>
   railway variables set SMTP_FROM=your-email@gmail.com
   railway variables set FRONTEND_URL=https://your-netlify-app.netlify.app
   railway variables set CORS_ORIGINS=https://your-netlify-app.netlify.app
   railway variables set LOG_LEVEL=info
   ```

6. **Deploy:**
   ```bash
   railway up
   ```

7. **Run Migration:**
   ```bash
   railway run npm run migrate
   ```

8. **Get Your Backend URL:**
   - Railway will provide a URL like: `https://your-app.railway.app`
   - Copy this URL!

---

## Step 2: Deploy Frontend to Netlify

### Option A: Using the Script (Easiest)

```bash
cd /Users/dennyt8/Job-Rejection-Tracker
chmod +x deploy-netlify.sh
./deploy-netlify.sh
```

The script will:
- Install Netlify CLI if needed
- Update API URL automatically
- Deploy your frontend

### Option B: Manual Netlify Setup

1. **Go to Netlify:**
   - Visit [netlify.com](https://netlify.com)
   - Sign up/Login

2. **Deploy:**
   - Drag & drop your project folder, OR
   - Connect GitHub repository

3. **Update API URL:**
   - Edit `unified-app.js`
   - Change: `const API_BASE_URL = 'https://your-railway-app.railway.app/api';`

4. **Redeploy** (if using GitHub, it auto-deploys on push)

---

## Step 3: Update Backend with Frontend URL

After Netlify gives you a URL:

```bash
cd backend
railway variables set FRONTEND_URL=https://your-netlify-app.netlify.app
railway variables set CORS_ORIGINS=https://your-netlify-app.netlify.app
```

---

## Step 4: Test Everything

1. **Backend Health:**
   ```bash
   curl https://your-railway-app.railway.app/api/health
   ```

2. **Frontend:**
   - Visit your Netlify URL
   - Try registering a user
   - Test the application

---

## 🎯 Quick Commands Summary

```bash
# Deploy Backend
cd backend && railway up

# Deploy Frontend  
# (Just drag folder to Netlify or use script)

# Update API URL
# Edit unified-app.js with Railway URL

# Run Migration
cd backend && railway run npm run migrate
```

---

## 📞 Need Help?

- **Railway Docs:** https://docs.railway.app
- **Netlify Docs:** https://docs.netlify.com
- **Full Guide:** See `DEPLOYMENT_PLAN.md`

---

**Ready to deploy? Run the scripts or follow the manual steps above!** 🚀
