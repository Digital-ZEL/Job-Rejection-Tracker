# 🚀 Push to GitHub - Quick Guide

## Step 1: Create Personal Access Token

1. **Go to:** https://github.com/settings/tokens
2. **Click:** "Generate new token" → "Generate new token (classic)"
3. **Name it:** "Job Tracker Push"
4. **Select scope:** Check `repo` (gives full repository access)
5. **Click:** "Generate token" at the bottom
6. **IMPORTANT:** Copy the token immediately (you won't see it again!)
   - It looks like: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

## Step 2: Push Your Code

Run this command in terminal:
```bash
cd /Users/dennyt8/Job-Rejection-Tracker
git push -u origin main
```

When prompted:
- **Username:** Enter your GitHub username
- **Password:** Paste the token (NOT your GitHub password)

That's it! Your code will be pushed to GitHub.

---

## Alternative: Use GitHub Desktop

If you have GitHub Desktop installed:
1. Open GitHub Desktop
2. File → Add Local Repository
3. Select: `/Users/dennyt8/Job-Rejection-Tracker`
4. Click "Publish repository"

---

## Need Help?

If you get stuck, the token might have expired or you might need to:
- Check your internet connection
- Verify the repository exists and you have access
- Try creating a new token
