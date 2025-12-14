#!/bin/bash

# Production Startup Script for Job Rejection Tracker
# Usage: ./start-production.sh

set -e

echo "🚀 Starting Job Rejection Tracker in Production Mode..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js version 18 or higher is required"
    echo "Current version: $(node -v)"
    exit 1
fi

# Check if .env file exists
if [ ! -f "backend/.env" ]; then
    echo "❌ Error: backend/.env file not found"
    echo "Please create it from backend/.env.example"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend
    npm install --production
    cd ..
fi

# Create logs directory
mkdir -p logs

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo "✅ PM2 found. Starting with PM2..."
    pm2 start ecosystem.config.js
    pm2 save
    echo "✅ Application started with PM2"
    echo "📊 Monitor with: pm2 monit"
    echo "📝 View logs with: pm2 logs"
else
    echo "⚠️  PM2 not found. Starting directly with Node.js..."
    echo "💡 Install PM2 for better process management: npm install -g pm2"
    cd backend
    NODE_ENV=production node server.js
fi
