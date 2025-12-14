# ⚡ Quick Deploy Guide (15 Minutes)

## Fastest Path to Production

### 1. Railway (Backend + Database + Redis) - 5 min

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy backend
cd backend
railway init
railway up
```

**In Railway Dashboard:**
1. Add PostgreSQL database → Copy `DATABASE_URL`
2. Add Redis database → Copy `REDIS_URL`
3. Add environment variables (see below)
4. Run migration: `railway run npm run migrate`

### 2. Netlify (Frontend) - 3 min

1. Go to [netlify.com](https://netlify.com)
2. Drag & drop your project folder
3. Deploy!

### 3. Environment Variables (Copy & Paste)

**Backend (Railway):**
```env
NODE_ENV=production
DATABASE_URL=<from-railway-postgres>
REDIS_URL=<from-railway-redis>
JWT_SECRET=<run: openssl rand -hex 64>
STRIPE_SECRET_KEY=sk_test_<from-stripe>
STRIPE_WEBHOOK_SECRET=whsec_<from-stripe>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=<gmail-app-password>
SMTP_FROM=noreply@yourdomain.com
FRONTEND_URL=https://your-app.netlify.app
CORS_ORIGINS=https://your-app.netlify.app
LOG_LEVEL=info
```

### 4. Stripe Setup - 3 min

1. [stripe.com](https://stripe.com) → Sign up
2. Get API keys (test mode)
3. Create products & prices
4. Set up webhook (after backend URL is ready)

### 5. Update Frontend - 2 min

Edit `unified-app.js`:
```javascript
const API_BASE_URL = 'https://your-railway-app.railway.app/api';
```

Redeploy on Netlify (auto-deploys on git push)

### 6. Test - 2 min

```bash
# Health check
curl https://your-railway-app.railway.app/api/health

# Test registration
curl -X POST https://your-railway-app.railway.app/api/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"Test1234"}'
```

**Done! 🚀**

---

## Need Help?

See full guide: `DEPLOYMENT_PLAN.md`
