# 📦 Installing Node.js

Node.js is required to run the backend server. Follow these steps:

## Quick Installation (macOS)

### Option 1: Official Installer (Recommended - Easiest)

1. **Download Node.js:**
   - Visit: https://nodejs.org/
   - Click "Download Node.js (LTS)" - this is the Long Term Support version
   - The download will start automatically

2. **Install:**
   - Open the downloaded `.pkg` file
   - Follow the installation wizard (click "Continue" through all steps)
   - Enter your password when prompted
   - Wait for installation to complete

3. **Verify Installation:**
   - Open a **new terminal window** (important!)
   - Run: `node --version`
   - You should see something like: `v20.11.0`
   - Run: `npm --version`
   - You should see something like: `10.2.4`

4. **Complete Setup:**
   ```bash
   cd /Users/dennyt8/Job-Rejection-Tracker
   ./complete-setup.sh
   ```

### Option 2: Using Homebrew

If you have Homebrew installed:

```bash
brew install node
```

Then verify:
```bash
node --version
npm --version
```

### Option 3: Using NVM (Node Version Manager)

This allows you to manage multiple Node.js versions:

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Restart terminal or run:
source ~/.zshrc

# Install Node.js LTS
nvm install --lts
nvm use --lts

# Verify
node --version
```

## After Installation

Once Node.js is installed, run:

```bash
cd /Users/dennyt8/Job-Rejection-Tracker
./complete-setup.sh
```

This will automatically:
- ✅ Install all backend dependencies
- ✅ Install all frontend dependencies  
- ✅ Create necessary directories
- ✅ Test the backend server
- ✅ Verify everything is working

## Troubleshooting

### "command not found: node"
- Make sure you opened a **new terminal window** after installation
- Try restarting your terminal application
- Check if Node.js is in your PATH: `echo $PATH`

### "Permission denied"
- Make sure you entered your password during installation
- Try running: `sudo chown -R $(whoami) /usr/local`

### Still having issues?
- Visit: https://nodejs.org/en/download/
- Choose the macOS installer
- Follow the installation steps carefully

## What's Next?

After Node.js is installed and `complete-setup.sh` has run:

1. **Update CORS origins** in `backend/.env` with your production domain
2. **Start the server** using `./start-production.sh` or `cd backend && npm start`
3. **Deploy** following `DEPLOYMENT_GUIDE.md`

---

**Need help?** Check `DEPLOYMENT_GUIDE.md` or `LAUNCH_READINESS.md`
