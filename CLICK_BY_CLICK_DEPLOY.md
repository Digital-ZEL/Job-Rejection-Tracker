# 🖱️ Click-by-Click Deployment Guide

Follow these exact steps - no coding required!

---

## 🚂 PART 1: Deploy Backend to Railway (10 minutes)

### Step 1: Create Railway Account
1. Go to: https://railway.app (already open)
2. Click **"Start a New Project"**
3. Click **"Login with GitHub"**
4. Authorize Railway

### Step 2: Deploy Your Backend
1. Click **"New Project"**
2. Click **"Deploy from GitHub repo"**
3. Find and select: **"Digital-ZEL/Job-Rejection-Tracker"**
4. Click **"Deploy Now"**
5. **IMPORTANT:** Click on the service that was created
6. Go to **"Settings"** tab
7. Find **"Root Directory"** → Change to: `backend`
8. Click **"Save"**
9. Railway will redeploy automatically

### Step 3: Add PostgreSQL Database
1. In your Railway project, click **"+ New"** (top right)
2. Click **"Database"**
3. Click **"Add PostgreSQL"**
4. Wait 30 seconds for it to provision
5. Click on the **PostgreSQL** service
6. Go to **"Variables"** tab
7. Find **`DATABASE_URL`** → Click the copy icon 📋
8. **Save this somewhere!** (You'll need it in Step 5)

### Step 4: Add Redis Database
1. Click **"+ New"** again
2. Click **"Database"**
3. Click **"Add Redis"**
4. Wait 30 seconds
5. Click on the **Redis** service
6. Go to **"Variables"** tab
7. Find **`REDIS_URL`** → Click the copy icon 📋
8. **Save this somewhere!**

### Step 5: Set Environment Variables
1. Go back to your **backend service** (the first one, not databases)
2. Click on it
3. Go to **"Variables"** tab
4. Click **"+ New Variable"** for each:

**Variable 1:**
- Name: `NODE_ENV`
- Value: `production`
- Click **"Add"**

**Variable 2:**
- Name: `DATABASE_URL`
- Value: `[paste the DATABASE_URL from Step 3]`
- Click **"Add"**

**Variable 3:**
- Name: `REDIS_URL`
- Value: `[paste the REDIS_URL from Step 4]`
- Click **"Add"`

**Variable 4:**
- Name: `JWT_SECRET`
- Value: `[I'll generate this for you - see below]`
- Click **"Add"`

**Variable 5:**
- Name: `STRIPE_SECRET_KEY`
- Value: `sk_test_your_key_here` (get from Stripe)
- Click **"Add"**

**Variable 6:**
- Name: `STRIPE_WEBHOOK_SECRET`
- Value: `whsec_your_secret_here` (get from Stripe)
- Click **"Add"`

**Variable 7:**
- Name: `SMTP_HOST`
- Value: `smtp.gmail.com`
- Click **"Add"**

**Variable 8:**
- Name: `SMTP_PORT`
- Value: `587`
- Click **"Add"**

**Variable 9:**
- Name: `SMTP_SECURE`
- Value: `false`
- Click **"Add"`

**Variable 10:**
- Name: `SMTP_USER`
- Value: `your-email@gmail.com`
- Click **"Add"`

**Variable 11:**
- Name: `SMTP_PASS`
- Value: `[your Gmail app password]`
- Click **"Add"**

**Variable 12:**
- Name: `SMTP_FROM`
- Value: `your-email@gmail.com`
- Click **"Add"`

**Variable 13:**
- Name: `FRONTEND_URL`
- Value: `https://your-app.netlify.app` (we'll update this after Netlify)
- Click **"Add"**

**Variable 14:**
- Name: `CORS_ORIGINS`
- Value: `https://your-app.netlify.app` (we'll update this after Netlify)
- Click **"Add"`

**Variable 15:**
- Name: `LOG_LEVEL`
- Value: `info`
- Click **"Add"**

### Step 6: Generate JWT Secret
Open Terminal and run:
```bash
openssl rand -hex 64
```
Copy the output and use it for `JWT_SECRET` variable.

### Step 7: Get Your Backend URL
1. Click on your backend service
2. Go to **"Settings"** tab
3. Scroll to **"Domains"** section
4. Click **"Generate Domain"**
5. Copy the URL (e.g., `https://your-app.railway.app`)
6. **Save this URL!**

### Step 8: Run Database Migration
1. Click on your backend service
2. Go to **"Deployments"** tab
3. Click the **"..."** menu (three dots) on the latest deployment
4. Click **"Open in Shell"**
5. In the shell, type: `npm run migrate`
6. Press Enter
7. Wait for "✅ All migrations completed successfully!"

**✅ Backend is now deployed!**

---

## 🌐 PART 2: Deploy Frontend to Netlify (5 minutes)

### Step 1: Create Netlify Account
1. Go to: https://netlify.com (already open)
2. Click **"Sign up"**
3. Click **"Sign up with GitHub"**
4. Authorize Netlify

### Step 2: Deploy Your Frontend
1. Click **"Add new site"** (top right)
2. Click **"Import an existing project"**
3. Click **"Deploy with GitHub"**
4. Authorize Netlify to access GitHub
5. Find and select: **"Digital-ZEL/Job-Rejection-Tracker"**
6. Click **"Next"**
7. **Build settings:**
   - Build command: (leave empty)
   - Publish directory: `/` (just a forward slash)
8. Click **"Deploy site"**
9. Wait 1-2 minutes for deployment

### Step 3: Get Your Frontend URL
1. Netlify will show: `https://random-name-123.netlify.app`
2. Click **"Site settings"**
3. Under **"General"** → **"Site details"**
4. Click **"Change site name"**
5. Enter: `job-tracker` (or your choice)
6. Your URL becomes: `https://job-tracker.netlify.app`
7. **Copy this URL!**

### Step 4: Update API URL in Code
1. Go to: https://github.com/Digital-ZEL/Job-Rejection-Tracker
2. Click on `unified-app.js`
3. Click the **pencil icon** (Edit)
4. Find this line (around line 1-20):
   ```javascript
   const API_BASE_URL = 'http://localhost:3001/api';
   ```
5. Change it to:
   ```javascript
   const API_BASE_URL = 'https://your-railway-app.railway.app/api';
   ```
   (Replace with your actual Railway URL from Part 1, Step 7)
6. Scroll down, click **"Commit changes"**
7. Netlify will auto-deploy the update!

**✅ Frontend is now deployed!**

---

## 🔗 PART 3: Connect Frontend & Backend (2 minutes)

### Step 1: Update Railway CORS
1. Go back to Railway
2. Click your backend service
3. Go to **"Variables"** tab
4. Find `FRONTEND_URL` → Click **"Edit"**
5. Change value to: `https://your-netlify-app.netlify.app`
6. Click **"Update"**
7. Find `CORS_ORIGINS` → Click **"Edit"**
8. Change value to: `https://your-netlify-app.netlify.app`
9. Click **"Update"**
10. Railway will auto-redeploy

### Step 2: Update Stripe Webhook (Optional - if using Stripe)
1. Go to: https://dashboard.stripe.com/webhooks
2. Click on your webhook endpoint
3. Update **Endpoint URL** to: `https://your-railway-app.railway.app/api/webhooks/stripe`
4. Click **"Save"**

---

## ✅ PART 4: Test Your Deployment

### Test Backend
Open in browser:
```
https://your-railway-app.railway.app/api/health
```

Should show:
```json
{
  "status": "OK",
  "version": "4.0.0"
}
```

### Test Frontend
1. Visit: `https://your-netlify-app.netlify.app`
2. Try registering a new user
3. Check your email for verification
4. Test creating an application

---

## 🎉 You're Done!

Your app is now live at:
- **Frontend:** `https://your-netlify-app.netlify.app`
- **Backend:** `https://your-railway-app.railway.app`

---

## 🆘 Need Help?

- **Railway Issues:** Check logs in Railway dashboard → Deployments
- **Netlify Issues:** Check deploy logs in Netlify dashboard
- **Connection Issues:** Verify CORS_ORIGINS matches Netlify URL exactly

**Follow these steps and you'll be live in 20 minutes!** 🚀
