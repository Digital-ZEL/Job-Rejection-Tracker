#!/bin/bash

echo "🌐 Deploying Frontend to Netlify..."
echo ""

# Check if Netlify CLI is installed
if ! command -v netlify &> /dev/null; then
    echo "❌ Netlify CLI not found. Installing..."
    npm install -g netlify-cli
fi

# Login to Netlify
echo "📝 Logging in to Netlify..."
netlify login

# Get backend URL
read -p "Enter your Railway backend URL (e.g., https://your-app.railway.app): " BACKEND_URL

# Update API URL in unified-app.js
echo "🔧 Updating API URL in unified-app.js..."
sed -i.bak "s|const API_BASE_URL = .*|const API_BASE_URL = '${BACKEND_URL}/api';|" unified-app.js

echo "✅ Updated API URL to: ${BACKEND_URL}/api"

# Initialize Netlify site
echo "🚀 Initializing Netlify site..."
netlify init

# Deploy
echo "📤 Deploying to Netlify..."
netlify deploy --prod

# Get site URL
SITE_URL=$(netlify status --json | grep -o '"siteUrl":"[^"]*' | cut -d'"' -f4)

echo ""
echo "✅ Frontend deployed!"
echo "   URL: $SITE_URL"
echo ""
echo "📋 Next steps:"
echo "   1. Update Railway FRONTEND_URL with: $SITE_URL"
echo "   2. Update Railway CORS_ORIGINS with: $SITE_URL"
echo "   3. Test your application!"
echo ""
