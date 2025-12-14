# 🤖 Automated Deployment Setup

## Option 1: GitHub Actions (Fully Automated)

Once set up, every push to GitHub will automatically deploy!

### Setup Steps:

#### 1. Get Railway Token
1. Go to [railway.app](https://railway.app)
2. Click your profile → Settings → Tokens
3. Create new token
4. Copy the token

#### 2. Get Netlify Token
1. Go to [app.netlify.com/user/applications](https://app.netlify.com/user/applications)
2. Click "New access token"
3. Name it "GitHub Actions"
4. Copy the token

#### 3. Add Secrets to GitHub
1. Go to your repo: https://github.com/Digital-ZEL/Job-Rejection-Tracker
2. Settings → Secrets and variables → Actions
3. Add these secrets:

```
RAILWAY_TOKEN=<your-railway-token>
RAILWAY_SERVICE_ID=<your-railway-service-id>
NETLIFY_AUTH_TOKEN=<your-netlify-token>
NETLIFY_SITE_ID=<your-netlify-site-id>
```

#### 4. Get Service IDs
- **Railway Service ID:** In Railway dashboard, click your service → Settings → Copy Service ID
- **Netlify Site ID:** In Netlify dashboard, Site settings → General → Site details → Site ID

---

## Option 2: One-Click Deploy Buttons

### Railway One-Click Deploy

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

1. Click the button above
2. Connect GitHub
3. Select your repo
4. Set Root Directory: `backend`
5. Add PostgreSQL and Redis
6. Set environment variables
7. Deploy!

### Netlify One-Click Deploy

1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import from GitHub"
3. Select your repo
4. Deploy!

---

## Option 3: Manual Web Deployment

See `WEB_DEPLOY.md` for step-by-step web interface instructions.

---

## 🎯 Recommended: Start with Web Deployment

1. **Deploy Backend (Railway):** Use web interface - 10 minutes
2. **Deploy Frontend (Netlify):** Use web interface - 5 minutes
3. **Connect them:** Update URLs
4. **Set up automation later:** Add GitHub Actions

---

**Which method do you want to use?** I recommend starting with the web interface (WEB_DEPLOY.md) for the first deployment, then setting up automation.
