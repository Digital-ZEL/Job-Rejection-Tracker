#!/bin/bash

# Script to help you get a test URL for your application

echo "🌐 Getting Test URL for Job Rejection Tracker"
echo "=============================================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo ""
    echo "For a quick test, you can:"
    echo "1. Test frontend locally: open index.html"
    echo "2. Install Node.js first (see INSTALL_NODEJS.md)"
    echo ""
    exit 1
fi

echo "✅ Node.js is installed"
echo ""

# Check if backend dependencies are installed
if [ ! -d "backend/node_modules" ]; then
    echo "📦 Installing backend dependencies..."
    cd backend
    npm install
    cd ..
fi

echo ""
echo "Starting backend server..."
echo ""

cd backend

# Start server in background
node server.js &
SERVER_PID=$!

# Wait for server to start
sleep 3

# Check if server is running
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ Backend server is running!"
    echo ""
    echo "📍 Local URLs:"
    echo "   - Backend API: http://localhost:3001"
    echo "   - Health Check: http://localhost:3001/api/health"
    echo ""
    echo "🌐 To get a public URL:"
    echo ""
    echo "Option 1: Using ngrok (for local testing)"
    echo "   1. Install: brew install ngrok"
    echo "   2. Run: ngrok http 3001"
    echo "   3. You'll get a public URL like: https://abc123.ngrok.io"
    echo ""
    echo "Option 2: Deploy to Railway (recommended)"
    echo "   1. Visit: https://railway.app/"
    echo "   2. Sign up with GitHub"
    echo "   3. Deploy from GitHub repository"
    echo "   4. Get instant public URL"
    echo ""
    echo "Option 3: Deploy to Render"
    echo "   1. Visit: https://render.com/"
    echo "   2. Sign up and deploy from GitHub"
    echo "   3. Get instant public URL"
    echo ""
    echo "Press Ctrl+C to stop the server"
    echo ""
    
    # Keep server running
    wait $SERVER_PID
else
    echo "❌ Could not start server"
    kill $SERVER_PID 2>/dev/null || true
    exit 1
fi
