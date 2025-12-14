# 🌐 Web-Based Deployment (No CLI Required)

## Easiest Way - Use Web Interfaces!

---

## 🚂 Step 1: Deploy Backend to Railway (Web)

### 1.1 Create Railway Account
1. Go to: [railway.app](https://railway.app)
2. Click "Start a New Project"
3. Sign up with GitHub (easiest)

### 1.2 Deploy from GitHub
1. **Select "Deploy from GitHub repo"**
2. **Choose:** `Digital-ZEL/Job-Rejection-Tracker`
3. **Root Directory:** Set to `backend`
4. **Click Deploy**

### 1.3 Add PostgreSQL Database
1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Wait for it to provision
4. Click on the PostgreSQL service
5. Go to **"Variables"** tab
6. Copy the `DATABASE_URL` value

### 1.4 Add Redis Database
1. Click **"+ New"** again
2. Select **"Database"** → **"Redis"**
3. Wait for it to provision
4. Click on the Redis service
5. Go to **"Variables"** tab
6. Copy the `REDIS_URL` value

### 1.5 Set Environment Variables
1. Click on your **backend service** (not the databases)
2. Go to **"Variables"** tab
3. Click **"+ New Variable"** and add each:

```env
NODE_ENV=production
DATABASE_URL=<paste-from-postgres-service>
REDIS_URL=<paste-from-redis-service>
JWT_SECRET=<generate-with-openssl-rand-hex-64>
STRIPE_SECRET_KEY=sk_test_<your-stripe-key>
STRIPE_WEBHOOK_SECRET=whsec_<your-stripe-webhook-secret>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=<your-gmail-app-password>
SMTP_FROM=your-email@gmail.com
FRONTEND_URL=https://your-app.netlify.app
CORS_ORIGINS=https://your-app.netlify.app
LOG_LEVEL=info
```

**To generate JWT_SECRET:**
- Open terminal and run: `openssl rand -hex 64`
- Copy the output

### 1.6 Get Your Backend URL
1. Click on your backend service
2. Go to **"Settings"** tab
3. Under **"Domains"**, Railway will show your URL
4. Or click **"Generate Domain"** to get a custom URL
5. **Copy this URL!** (e.g., `https://your-app.railway.app`)

### 1.7 Run Database Migration
1. In Railway, click on your backend service
2. Go to **"Deployments"** tab
3. Click the **"..."** menu on latest deployment
4. Select **"Open in Shell"**
5. Run: `npm run migrate`
6. Wait for it to complete

---

## 🌐 Step 2: Deploy Frontend to Netlify (Web)

### 2.1 Create Netlify Account
1. Go to: [netlify.com](https://netlify.com)
2. Click "Sign up"
3. Sign up with GitHub (easiest)

### 2.2 Deploy from GitHub
1. Click **"Add new site"** → **"Import an existing project"**
2. Choose **"Deploy with GitHub"**
3. Authorize Netlify
4. Select repository: `Digital-ZEL/Job-Rejection-Tracker`
5. **Build settings:**
   - Build command: (leave empty)
   - Publish directory: `/` (root)
6. Click **"Deploy site"**

### 2.3 Update API URL
1. After deployment, Netlify will give you a URL
2. Go to your GitHub repo
3. Edit `unified-app.js`
4. Find this line (around line 1-20):
   ```javascript
   const API_BASE_URL = 'http://localhost:3001/api';
   ```
5. Change it to:
   ```javascript
   const API_BASE_URL = 'https://your-railway-app.railway.app/api';
   ```
   (Replace with your actual Railway URL)

6. Commit and push:
   ```bash
   git add unified-app.js
   git commit -m "Update API URL for production"
   git push
   ```

7. Netlify will auto-deploy the update!

### 2.4 Get Your Frontend URL
- Netlify will show: `https://your-app-name.netlify.app`
- **Copy this URL!**

---

## 🔗 Step 3: Connect Frontend & Backend

### 3.1 Update Railway CORS
1. Go back to Railway
2. Click your backend service
3. Go to **"Variables"** tab
4. Update:
   - `FRONTEND_URL` = `https://your-app-name.netlify.app`
   - `CORS_ORIGINS` = `https://your-app-name.netlify.app`
5. Railway will auto-redeploy

### 3.2 Update Stripe Webhook
1. Go to [dashboard.stripe.com/webhooks](https://dashboard.stripe.com/webhooks)
2. Edit your webhook endpoint
3. Update URL to: `https://your-railway-app.railway.app/api/webhooks/stripe`
4. Save

---

## ✅ Step 4: Test Your Deployment

### Test Backend
```bash
curl https://your-railway-app.railway.app/api/health
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

### Test Frontend
1. Visit: `https://your-app-name.netlify.app`
2. Try registering a user
3. Check email for verification
4. Test creating an application

---

## 🎯 Quick Checklist

- [ ] Railway account created
- [ ] Backend deployed from GitHub
- [ ] PostgreSQL added and DATABASE_URL copied
- [ ] Redis added and REDIS_URL copied
- [ ] All environment variables set in Railway
- [ ] Database migration run
- [ ] Backend URL copied
- [ ] Netlify account created
- [ ] Frontend deployed from GitHub
- [ ] API URL updated in unified-app.js
- [ ] Frontend URL copied
- [ ] Railway CORS updated with frontend URL
- [ ] Stripe webhook URL updated
- [ ] Tested backend health endpoint
- [ ] Tested frontend registration

---

## 🚨 Troubleshooting

### Backend won't start
- Check all environment variables are set
- Check DATABASE_URL and REDIS_URL are correct
- View logs in Railway dashboard

### Frontend can't connect to backend
- Verify API URL in unified-app.js matches Railway URL
- Check CORS_ORIGINS in Railway includes Netlify URL
- Check browser console for errors

### Database errors
- Make sure migration ran: `npm run migrate` in Railway shell
- Check DATABASE_URL is correct

---

**That's it! Your app should be live! 🎉**
