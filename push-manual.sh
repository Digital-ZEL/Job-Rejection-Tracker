#!/bin/bash
# Manual push script for GitHub

echo "🚀 Pushing to GitHub..."
echo ""
echo "If this fails, please check:"
echo "1. Token has 'repo' permissions"
echo "2. Token is not expired"
echo "3. You have write access to the repository"
echo ""

cd /Users/dennyt8/Job-Rejection-Tracker

# Try push with token in URL
git push -u origin main

echo ""
echo "If push failed, try running this manually:"
echo "git push -u origin main"
echo ""
echo "When prompted:"
echo "  Username: Digital-ZEL"
echo "  Password: [paste your token]"
