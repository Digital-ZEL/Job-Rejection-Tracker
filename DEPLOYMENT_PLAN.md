# 🚀 Complete Deployment Plan - Step by Step

## Overview

This guide covers deploying both the frontend and backend of Smart Job Tracker to production.

---

## 📋 Pre-Deployment Checklist

- [ ] All code committed to Git
- [ ] Environment variables documented
- [ ] Database migrations tested
- [ ] Stripe account set up (test mode)
- [ ] Email service configured (SMTP)
- [ ] Domain name ready (optional)
- [ ] SSL certificate ready (for production)

---

## 🎯 Deployment Options

### Option A: All-in-One Platform (Easiest)
- **Railway** - Deploys frontend + backend + PostgreSQL + Redis
- **Render** - Similar to Railway
- **Heroku** - Classic PaaS (paid plans)

### Option B: Separate Services (More Control)
- **Frontend:** Netlify / Vercel / GitHub Pages
- **Backend:** Railway / Render / AWS / DigitalOcean
- **Database:** Railway Postgres / AWS RDS / Supabase
- **Redis:** Upstash / Redis Cloud / AWS ElastiCache

---

## 📦 Step 1: Prepare Your Code

### 1.1 Final Code Review
```bash
cd /Users/dennyt8/Job-Rejection-Tracker

# Check for any uncommitted changes
git status

# Commit everything
git add .
git commit -m "Ready for production deployment"
```

### 1.2 Update Frontend API URL
Update `unified-app.js` to use your production backend URL:

```javascript
// Find this line (around line 1-10)
const API_BASE_URL = 'http://localhost:3001/api';

// Change to:
const API_BASE_URL = 'https://your-backend-domain.com/api';
```

---

## 🗄️ Step 2: Set Up Database (PostgreSQL)

### Option A: Railway (Recommended - Free tier available)

1. **Sign up:** [railway.app](https://railway.app)
2. **Create New Project**
3. **Add PostgreSQL:**
   - Click "New" → "Database" → "PostgreSQL"
   - Wait for it to provision
   - Copy the connection string (DATABASE_URL)

### Option B: Supabase (Free tier)

1. **Sign up:** [supabase.com](https://supabase.com)
2. **Create New Project**
3. **Get Connection String:**
   - Go to Settings → Database
   - Copy "Connection string" (URI format)

### Option C: AWS RDS / DigitalOcean (Paid)

Follow your provider's PostgreSQL setup guide.

---

## 🔴 Step 3: Set Up Redis

### Option A: Upstash (Recommended - Free tier)

1. **Sign up:** [upstash.com](https://upstash.com)
2. **Create Redis Database**
3. **Copy Redis URL** (starts with `redis://`)

### Option B: Railway

1. In Railway project, click "New" → "Database" → "Redis"
2. Copy connection URL

### Option C: Redis Cloud (Free tier)

1. **Sign up:** [redis.com/cloud](https://redis.com/cloud)
2. **Create free database**
3. **Copy connection URL**

---

## 💳 Step 4: Set Up Stripe

### 4.1 Create Stripe Account

1. **Sign up:** [stripe.com](https://stripe.com)
2. **Complete account setup**
3. **Get API Keys:**
   - Go to Developers → API Keys
   - Copy **Publishable key** (starts with `pk_test_...`)
   - Copy **Secret key** (starts with `sk_test_...`)

### 4.2 Create Products & Prices

1. **Go to:** Products → Add Product
2. **Create Professional Plan:**
   - Name: "Professional Plan"
   - Price: $9.99/month (or your price)
   - Billing: Recurring
   - Copy the **Price ID** (starts with `price_...`)

3. **Create Enterprise Plan:**
   - Name: "Enterprise Plan"
   - Price: $29.99/month (or your price)
   - Copy the **Price ID**

### 4.3 Set Up Webhook

1. **Go to:** Developers → Webhooks
2. **Add endpoint:**
   - URL: `https://your-backend-domain.com/api/webhooks/stripe`
   - Events to send:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
3. **Copy Webhook Signing Secret** (starts with `whsec_...`)

**⚠️ Important:** Update webhook URL after backend is deployed!

---

## ✉️ Step 5: Set Up Email Service

### Option A: Gmail (Free, for testing)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate App Password:**
   - Go to: [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
   - Select "Mail" and "Other"
   - Name it "Smart Job Tracker"
   - Copy the 16-character password

### Option B: SendGrid (Free tier - 100 emails/day)

1. **Sign up:** [sendgrid.com](https://sendgrid.com)
2. **Verify sender email**
3. **Create API Key:**
   - Settings → API Keys → Create API Key
   - Copy the key

**SendGrid SMTP Settings:**
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=<your-api-key>
```

### Option C: AWS SES (Very cheap)

1. **Set up AWS account**
2. **Verify email domain**
3. **Get SMTP credentials**

---

## 🖥️ Step 6: Deploy Backend

### Option A: Railway (Easiest)

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   railway login
   ```

2. **Initialize Project:**
   ```bash
   cd backend
   railway init
   ```

3. **Add Environment Variables:**
   ```bash
   railway variables set NODE_ENV=production
   railway variables set DATABASE_URL=<your-postgres-url>
   railway variables set REDIS_URL=<your-redis-url>
   railway variables set JWT_SECRET=<generate-with-openssl-rand-hex-64>
   railway variables set STRIPE_SECRET_KEY=<your-stripe-secret-key>
   railway variables set STRIPE_WEBHOOK_SECRET=<your-webhook-secret>
   railway variables set SMTP_HOST=<your-smtp-host>
   railway variables set SMTP_PORT=587
   railway variables set SMTP_USER=<your-smtp-user>
   railway variables set SMTP_PASS=<your-smtp-password>
   railway variables set SMTP_FROM=noreply@yourdomain.com
   railway variables set FRONTEND_URL=https://your-frontend-domain.com
   railway variables set CORS_ORIGINS=https://your-frontend-domain.com
   railway variables set LOG_LEVEL=info
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

5. **Run Database Migration:**
   ```bash
   railway run npm run migrate
   ```

6. **Get Backend URL:**
   - Railway will provide a URL like: `https://your-app.railway.app`
   - Copy this URL

### Option B: Render

1. **Sign up:** [render.com](https://render.com)

2. **Create New Web Service:**
   - Connect your GitHub repo
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Node`

3. **Add Environment Variables:**
   - Go to Environment tab
   - Add all variables from Step 6 (Option A)

4. **Create PostgreSQL Database:**
   - New → PostgreSQL
   - Copy connection string to `DATABASE_URL`

5. **Deploy:**
   - Render will auto-deploy on git push

### Option C: DigitalOcean App Platform

1. **Sign up:** [digitalocean.com](https://digitalocean.com)

2. **Create App:**
   - Connect GitHub repo
   - Select `backend` directory
   - Add PostgreSQL database
   - Add Redis database

3. **Add Environment Variables** (same as Railway)

4. **Deploy**

---

## 🌐 Step 7: Deploy Frontend

### Option A: Netlify (Recommended)

1. **Sign up:** [netlify.com](https://netlify.com)

2. **Deploy:**
   - Drag & drop the entire project folder, OR
   - Connect GitHub repo

3. **Configure Build:**
   - Build command: (leave empty - static site)
   - Publish directory: `/` (root)

4. **Add Environment Variable:**
   - Site settings → Environment variables
   - Add: `VITE_API_URL` or update `unified-app.js` directly

5. **Update API URL in Code:**
   - Edit `unified-app.js`
   - Change `API_BASE_URL` to your backend URL

6. **Deploy:**
   - Netlify will provide a URL like: `https://your-app.netlify.app`

### Option B: Vercel

1. **Sign up:** [vercel.com](https://vercel.com)

2. **Import Project:**
   - Connect GitHub repo
   - Framework Preset: "Other"

3. **Deploy**

### Option C: GitHub Pages

1. **Push to GitHub:**
   ```bash
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Enable GitHub Pages:**
   - Settings → Pages
   - Source: `main` branch
   - Folder: `/ (root)`

3. **Update API URL** in `unified-app.js`

---

## 🔧 Step 8: Configure Environment Variables

### Backend (.env in production)

```env
# Server
NODE_ENV=production
PORT=3001

# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Redis
REDIS_URL=redis://user:pass@host:6379

# JWT
JWT_SECRET=<generate-strong-secret>

# CORS
CORS_ORIGINS=https://your-frontend-domain.com

# Frontend URL
FRONTEND_URL=https://your-frontend-domain.com

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com

# Stripe
STRIPE_SECRET_KEY=sk_live_...  # Use live keys in production
STRIPE_WEBHOOK_SECRET=whsec_...

# Logging
LOG_LEVEL=info
```

### Generate JWT Secret:
```bash
openssl rand -hex 64
```

---

## 🗄️ Step 9: Run Database Migration

After backend is deployed:

```bash
# If using Railway
railway run npm run migrate

# If using Render
# Add build command: npm install && npm run migrate

# Or SSH into server and run:
cd backend
npm run migrate
```

---

## 🔗 Step 10: Update Frontend API URL

1. **Edit `unified-app.js`:**
   ```javascript
   const API_BASE_URL = 'https://your-backend-domain.com/api';
   ```

2. **Redeploy frontend** (if using Netlify/Vercel, it auto-deploys on git push)

---

## 🧪 Step 11: Test Everything

### 11.1 Test Backend Health
```bash
curl https://your-backend-domain.com/api/health
```

Should return:
```json
{
  "status": "OK",
  "version": "4.0.0",
  "services": {
    "database": "connected",
    "redis": "connected"
  }
}
```

### 11.2 Test Registration
```bash
curl -X POST https://your-backend-domain.com/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPassword123"
  }'
```

### 11.3 Test Frontend
- Visit your frontend URL
- Try registering a new account
- Check email for verification link
- Test login
- Test creating an application

### 11.4 Test Stripe (Test Mode)
- Go to pricing page
- Click upgrade
- Use test card: `4242 4242 4242 4242`
- Complete checkout
- Verify webhook received

---

## 🔐 Step 12: Security Hardening

### 12.1 Enable HTTPS
- Netlify/Vercel: Automatic
- Railway/Render: Automatic
- Custom domain: Use Let's Encrypt

### 12.2 Update Stripe to Live Mode
1. **Get Live API Keys:**
   - Stripe Dashboard → Switch to Live mode
   - Copy live keys

2. **Update Environment Variables:**
   - `STRIPE_SECRET_KEY=sk_live_...`
   - Update webhook endpoint in Stripe

3. **Create Live Products:**
   - Create products in live mode
   - Update frontend with live price IDs

### 12.3 Set Strong Secrets
- Generate new `JWT_SECRET` for production
- Use strong passwords for all services

### 12.4 Enable Rate Limiting
- Already configured in code
- Monitor in APM metrics

---

## 📊 Step 13: Set Up Monitoring

### 13.1 Check Logs
- **Railway:** View logs in dashboard
- **Render:** View logs in dashboard
- **Netlify:** View function logs

### 13.2 Monitor APM Metrics
```bash
curl -H "Authorization: Bearer <token>" \
  https://your-backend-domain.com/api/metrics
```

### 13.3 Set Up Alerts
- Database connection failures
- High error rates
- Slow response times

---

## 🚨 Step 14: Post-Deployment Checklist

- [ ] Backend health check returns OK
- [ ] Frontend loads correctly
- [ ] User registration works
- [ ] Email verification works
- [ ] Password reset works
- [ ] Login works
- [ ] Application CRUD works
- [ ] Analytics endpoint works
- [ ] Stripe checkout works (test mode)
- [ ] Webhooks received in Stripe dashboard
- [ ] Redis caching works
- [ ] Rate limiting works
- [ ] Logs are being written
- [ ] APM metrics are tracking
- [ ] All environment variables set
- [ ] Database migrations completed
- [ ] SSL/HTTPS enabled
- [ ] CORS configured correctly

---

## 🔄 Step 15: Ongoing Maintenance

### Daily
- Check error logs
- Monitor APM metrics

### Weekly
- Review slow queries
- Check cache hit rates
- Review error patterns

### Monthly
- Update dependencies
- Review security patches
- Backup database

---

## 📞 Troubleshooting

### Backend won't start
- Check environment variables
- Check database connection
- Check Redis connection
- View logs: `railway logs` or Render dashboard

### Database connection fails
- Verify `DATABASE_URL` is correct
- Check database is accessible
- Verify SSL settings

### Redis connection fails
- Verify `REDIS_URL` is correct
- App will work without Redis (graceful degradation)

### Email not sending
- Check SMTP credentials
- Verify email service is active
- Check spam folder

### Stripe webhooks not working
- Verify webhook URL is correct
- Check webhook secret matches
- Use Stripe CLI for local testing

---

## 🎯 Quick Deploy Commands

### Railway (Fastest)
```bash
cd backend
railway login
railway init
railway variables set DATABASE_URL=...
railway variables set REDIS_URL=...
# ... set all variables
railway up
railway run npm run migrate
```

### Render
1. Connect GitHub repo
2. Add environment variables
3. Deploy (auto-deploys on push)

### Netlify
1. Drag & drop folder
2. Deploy

---

## 📚 Additional Resources

- **Railway Docs:** https://docs.railway.app
- **Render Docs:** https://render.com/docs
- **Netlify Docs:** https://docs.netlify.com
- **Stripe Docs:** https://stripe.com/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs

---

## ✅ Deployment Complete!

Once all steps are done, your app will be live at:
- **Frontend:** `https://your-frontend-domain.com`
- **Backend:** `https://your-backend-domain.com`
- **API Health:** `https://your-backend-domain.com/api/health`

**Congratulations! 🎉**

---

*Last updated: December 2024*
