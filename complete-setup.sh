#!/bin/bash

# Complete Setup Script - Runs all remaining setup steps
# Run this after Node.js is installed

set -e

echo "🚀 Completing Production Setup..."
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js first:"
    echo "  1. Visit https://nodejs.org/ and download the LTS version"
    echo "  2. Run the installer"
    echo "  3. Restart your terminal"
    echo "  4. Run this script again"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js found: $NODE_VERSION${NC}"
echo ""

# Step 1: Install Backend Dependencies
echo "📦 Installing backend dependencies..."
cd backend
if [ ! -d "node_modules" ]; then
    npm install --production
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo "   Updating dependencies..."
    npm install --production
    echo -e "${GREEN}✅ Backend dependencies updated${NC}"
fi
cd ..
echo ""

# Step 2: Install Frontend Dependencies
echo "📦 Installing frontend dependencies..."
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo "   Updating dependencies..."
    npm install
    echo -e "${GREEN}✅ Frontend dependencies updated${NC}"
fi
echo ""

# Step 3: Create logs directory
echo "📁 Creating logs directory..."
mkdir -p logs
echo -e "${GREEN}✅ Logs directory created${NC}"
echo ""

# Step 4: Test Backend
echo "🧪 Testing backend server..."
cd backend

# Check if port is available
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo -e "${YELLOW}⚠️  Port 3001 is already in use${NC}"
    echo "   Server may already be running"
else
    echo "   Starting server for health check..."
    timeout 5 node server.js > /dev/null 2>&1 &
    SERVER_PID=$!
    sleep 2
    
    if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend server is working!${NC}"
        kill $SERVER_PID 2>/dev/null || true
    else
        echo -e "${YELLOW}⚠️  Could not verify server (may need manual testing)${NC}"
        kill $SERVER_PID 2>/dev/null || true
    fi
    wait $SERVER_PID 2>/dev/null || true
fi

cd ..
echo ""

# Step 5: Final Summary
echo "=================================="
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo "=================================="
echo ""
echo "Next steps:"
echo "1. Update CORS_ORIGINS in backend/.env with your production domain"
echo "2. Start the server:"
echo "   - PM2: ./start-production.sh"
echo "   - Direct: cd backend && npm start"
echo ""
echo "📚 See DEPLOYMENT_GUIDE.md for deployment options"
echo ""
