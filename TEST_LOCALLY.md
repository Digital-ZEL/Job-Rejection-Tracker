# 🧪 Testing Your Application

## Quick Test Options

### Option 1: Test Frontend Locally (Works Now!)

The frontend works **standalone** without the backend. You can test it right now:

**macOS:**
```bash
cd /Users/dennyt8/Job-Rejection-Tracker
open index.html
```

**Or manually:**
1. Open Finder
2. Navigate to `/Users/dennyt8/Job-Rejection-Tracker`
3. Double-click `index.html`
4. It will open in your default browser

**Features you can test:**
- ✅ Add job applications
- ✅ Drag & drop between stages
- ✅ Analytics dashboard
- ✅ Resume builder
- ✅ Data export
- ✅ Smart paste feature

**Note:** This uses localStorage, so data is stored in your browser.

### Option 2: Full Stack Test (Requires Node.js)

Once Node.js is installed:

1. **Start the backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Test the API:**
   - Health check: http://localhost:3001/api/health
   - Test in browser or with curl:
     ```bash
     curl http://localhost:3001/api/health
     ```

3. **Connect frontend to backend:**
   - Edit `src/config.js`
   - Set `BASE_URL: 'http://localhost:3001'`
   - Refresh the frontend page

### Option 3: Get a Public Test URL

#### Using ngrok (for local testing with public URL)

1. **Install ngrok:**
   ```bash
   brew install ngrok
   # Or download from https://ngrok.com/
   ```

2. **Start your backend:**
   ```bash
   cd backend
   npm start
   ```

3. **In another terminal, create tunnel:**
   ```bash
   ngrok http 3001
   ```

4. **You'll get a URL like:** `https://abc123.ngrok.io`
   - Use this URL to test from anywhere
   - Share with others for testing

#### Using Cloud Deployment (Recommended)

**Railway (Free tier, instant URL):**
1. Visit: https://railway.app/
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub"
4. Select your repository
5. Railway automatically detects Node.js and deploys
6. **You get an instant URL like:** `https://your-app.railway.app`

**Render (Free tier, instant URL):**
1. Visit: https://render.com/
2. Sign up
3. Click "New" → "Web Service"
4. Connect your GitHub repository
5. Render auto-detects and deploys
6. **You get an instant URL like:** `https://your-app.onrender.com`

**Vercel (For frontend, instant URL):**
1. Visit: https://vercel.com/
2. Sign up with GitHub
3. Import your repository
4. Deploy (no configuration needed)
5. **You get an instant URL like:** `https://your-app.vercel.app`

## Current Status

- ✅ **Frontend**: Ready to test locally (open `index.html`)
- ⏳ **Backend**: Needs Node.js installation first
- ⏳ **Public URL**: Needs deployment or ngrok

## Quick Test Right Now

**Test the frontend immediately:**
```bash
cd /Users/dennyt8/Job-Rejection-Tracker
open index.html
```

This works **right now** without any setup! 🚀
