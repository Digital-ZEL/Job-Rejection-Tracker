#!/bin/bash

echo "🚂 Deploying Backend to Railway..."
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI not found. Installing..."
    npm install -g @railway/cli
fi

# Navigate to backend directory
cd backend

# Login to Railway (will open browser)
echo "📝 Please login to Railway in the browser that opens..."
railway login

# Initialize Railway project
echo "🔧 Initializing Railway project..."
railway init

# Add PostgreSQL database
echo "🗄️  Adding PostgreSQL database..."
echo "   Please add PostgreSQL service in Railway dashboard:"
echo "   1. Go to your project in Railway"
echo "   2. Click 'New' → 'Database' → 'PostgreSQL'"
echo "   3. Copy the DATABASE_URL"
echo ""
read -p "Press Enter after you've added PostgreSQL and copied DATABASE_URL..."

# Add Redis database
echo "🔴 Adding Redis database..."
echo "   Please add Redis service in Railway dashboard:"
echo "   1. Go to your project in Railway"
echo "   2. Click 'New' → 'Database' → 'Redis'"
echo "   3. Copy the REDIS_URL"
echo ""
read -p "Press Enter after you've added Redis and copied REDIS_URL..."

# Set environment variables
echo "⚙️  Setting environment variables..."
echo ""
echo "Please provide the following values:"

read -p "DATABASE_URL: " DATABASE_URL
read -p "REDIS_URL: " REDIS_URL
read -p "JWT_SECRET (press Enter to generate): " JWT_SECRET
read -p "STRIPE_SECRET_KEY: " STRIPE_SECRET_KEY
read -p "STRIPE_WEBHOOK_SECRET: " STRIPE_WEBHOOK_SECRET
read -p "SMTP_HOST (default: smtp.gmail.com): " SMTP_HOST
read -p "SMTP_USER: " SMTP_USER
read -p "SMTP_PASS: " SMTP_PASS
read -p "FRONTEND_URL (your Netlify URL): " FRONTEND_URL

# Generate JWT secret if not provided
if [ -z "$JWT_SECRET" ]; then
    JWT_SECRET=$(openssl rand -hex 64)
    echo "✅ Generated JWT_SECRET: $JWT_SECRET"
fi

SMTP_HOST=${SMTP_HOST:-smtp.gmail.com}

# Set variables in Railway
railway variables set NODE_ENV=production
railway variables set DATABASE_URL="$DATABASE_URL"
railway variables set REDIS_URL="$REDIS_URL"
railway variables set JWT_SECRET="$JWT_SECRET"
railway variables set STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
railway variables set STRIPE_WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"
railway variables set SMTP_HOST="$SMTP_HOST"
railway variables set SMTP_PORT=587
railway variables set SMTP_SECURE=false
railway variables set SMTP_USER="$SMTP_USER"
railway variables set SMTP_PASS="$SMTP_PASS"
railway variables set SMTP_FROM="$SMTP_USER"
railway variables set FRONTEND_URL="$FRONTEND_URL"
railway variables set CORS_ORIGINS="$FRONTEND_URL"
railway variables set LOG_LEVEL=info

echo ""
echo "🚀 Deploying to Railway..."
railway up

echo ""
echo "⏳ Waiting for deployment..."
sleep 5

# Get the deployment URL
RAILWAY_URL=$(railway domain)
echo ""
echo "✅ Backend deployed!"
echo "   URL: $RAILWAY_URL"
echo ""
echo "📋 Next steps:"
echo "   1. Run database migration: railway run npm run migrate"
echo "   2. Update FRONTEND_URL in unified-app.js with: $RAILWAY_URL/api"
echo "   3. Deploy frontend to Netlify"
echo ""
