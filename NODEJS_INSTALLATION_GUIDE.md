# Node.js Installation Guide for First Job Tracker

## 🚨 Current Issue
Node.js is not installed or not properly configured on your system. This is required to run the backend server.

## 🛠️ Step-by-Step Installation

### Step 1: Download Node.js
1. Go to https://nodejs.org/
2. Download the **LTS (Long Term Support)** version for Windows
3. The file will be named something like `node-vXX.XX.X-win-x64.msi`

### Step 2: Install Node.js
1. Double-click the downloaded `.msi` file
2. Follow the installation wizard with default settings
3. **Important:** Make sure to check "Automatically install the necessary tools..." if prompted

### Step 3: Verify Installation
After installation, **close and reopen** your terminal/command prompt, then run:

```bash
node --version
npm --version
```

You should see version numbers like:
```
v18.17.0
9.6.7
```

### Step 4: Restart Your Terminal
**This is crucial!** Close all terminal windows and open a new one to refresh the PATH.

## 🔧 Manual PATH Configuration (If needed)

If Node.js still isn't recognized after installation:

1. Find Node.js installation directory (usually `C:\Program Files\nodejs\`)
2. Add it to your system PATH:
   - Press `Win + R`, type `sysdm.cpl`, press Enter
   - Go to "Advanced" tab → "Environment Variables"
   - Under "System Variables", find and select "Path" → "Edit"
   - Click "New" and add `C:\Program Files\nodejs\`
   - Click "OK" to save
3. Close and reopen your terminal

## 🎯 Once Node.js is Working

### Install Dependencies
```bash
cd first-job-tracker/backend
npm install
```

### Test Your Setup
```bash
npm run test-setup
```

### Start the Development Server
```bash
npm run dev
```

Visit http://localhost:3001/api/health to verify it's working.

## 🆘 Common Issues and Solutions

### Issue: "node is not recognized"
**Solution:** Restart your terminal and try again. If still not working, check PATH configuration above.

### Issue: "npm is not recognized"
**Solution:** This usually means Node.js wasn't installed properly. Reinstall Node.js and make sure to install npm.

### Issue: Permission errors during npm install
**Solution:** Run your terminal as Administrator:
1. Press `Win + X`
2. Select "Windows Terminal (Admin)" or "Command Prompt (Admin)"
3. Navigate to your project and run `npm install`

### Issue: Port already in use
**Solution:** Change the PORT in `backend/.env` or kill the process using that port:
```bash
# Windows
taskkill /f /pid <port-number>
```

## 🧪 Quick Verification Script

I've created a verification script for you. Once Node.js is installed:

1. Open a **new** terminal/command prompt
2. Navigate to your project directory
3. Run: `node check-node.js`

This will tell you if Node.js and npm are properly installed.

## 💡 Pro Tips

1. **Always restart your terminal** after installing Node.js
2. **Use the LTS version** - it's more stable for production
3. **Run setup-backend.bat** after Node.js installation - it automates everything
4. **Check SETUP_INSTRUCTIONS.md** for detailed guidance

## 🎉 Success Confirmation

When everything is working, you should be able to:
- Run `node --version` and see a version number
- Run `npm --version` and see a version number
- Run `npm install` in the backend directory without errors
- Run `npm run dev` and see the server start on port 3001

Need help? Check the console output for specific error messages and refer to this guide!
