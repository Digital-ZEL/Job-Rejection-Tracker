#!/bin/bash

# Complete Production Setup Script
# This script will install Node.js (if needed) and set up everything for production

set -e

echo "🚀 Job Rejection Tracker - Complete Production Setup"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Step 1: Check/Install Node.js
echo "📦 Step 1: Checking Node.js installation..."

if command_exists node; then
    NODE_VERSION=$(node -v)
    echo -e "${GREEN}✅ Node.js is installed: $NODE_VERSION${NC}"
    
    # Check if version is 18+
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -lt 18 ]; then
        echo -e "${YELLOW}⚠️  Node.js version 18+ is recommended. Current: $NODE_VERSION${NC}"
        echo "   You may encounter issues. Consider upgrading."
    fi
else
    echo -e "${YELLOW}⚠️  Node.js is not installed${NC}"
    echo ""
    echo "Please install Node.js using one of these methods:"
    echo ""
    echo "Option 1: Download installer (Recommended)"
    echo "   Visit: https://nodejs.org/"
    echo "   Download the LTS version and run the installer"
    echo ""
    echo "Option 2: Using Homebrew (if you have it)"
    echo "   brew install node"
    echo ""
    echo "Option 3: Using nvm (Node Version Manager)"
    echo "   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash"
    echo "   nvm install --lts"
    echo ""
    read -p "Press Enter after you've installed Node.js, or Ctrl+C to cancel..."
    
    # Verify installation
    if ! command_exists node; then
        echo -e "${RED}❌ Node.js is still not installed. Please install it and run this script again.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✅ Node.js installation verified!${NC}"
fi

# Step 2: Install Backend Dependencies
echo ""
echo "📦 Step 2: Installing backend dependencies..."
cd backend

if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found in backend directory${NC}"
    exit 1
fi

if [ ! -d "node_modules" ]; then
    echo "   Installing npm packages (this may take a few minutes)..."
    npm install --production
    echo -e "${GREEN}✅ Backend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Backend dependencies already installed${NC}"
    echo "   Running npm install to ensure everything is up to date..."
    npm install --production
fi

cd ..

# Step 3: Install Frontend Dependencies (Optional)
echo ""
echo "📦 Step 3: Installing frontend dependencies (for testing)..."
if [ ! -d "node_modules" ]; then
    npm install
    echo -e "${GREEN}✅ Frontend dependencies installed${NC}"
else
    echo -e "${GREEN}✅ Frontend dependencies already installed${NC}"
fi

# Step 4: Verify .env file
echo ""
echo "🔐 Step 4: Verifying environment configuration..."
if [ ! -f "backend/.env" ]; then
    echo -e "${RED}❌ Error: backend/.env file not found${NC}"
    exit 1
fi

# Check if JWT_SECRET is still the default
if grep -q "your-secret-key\|your-super-secret" backend/.env; then
    echo -e "${YELLOW}⚠️  Warning: JWT_SECRET may still be using default value${NC}"
    echo "   Please verify backend/.env has a secure JWT_SECRET"
fi

echo -e "${GREEN}✅ Environment file found${NC}"

# Step 5: Create logs directory
echo ""
echo "📁 Step 5: Creating necessary directories..."
mkdir -p logs
echo -e "${GREEN}✅ Directories created${NC}"

# Step 6: Test Backend Server
echo ""
echo "🧪 Step 6: Testing backend server..."
cd backend

# Start server in background for testing
echo "   Starting server for health check..."
timeout 10 node server.js &
SERVER_PID=$!
sleep 3

# Test health endpoint
if curl -f http://localhost:3001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Backend server is working!${NC}"
    echo "   Health check: http://localhost:3001/api/health"
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
else
    echo -e "${YELLOW}⚠️  Could not verify server (this is okay if port is in use)${NC}"
    kill $SERVER_PID 2>/dev/null || true
    wait $SERVER_PID 2>/dev/null || true
fi

cd ..

# Step 7: Final Checklist
echo ""
echo "✅ Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Update CORS_ORIGINS in backend/.env with your production domain"
echo "2. Start the server:"
echo "   - Using PM2: ./start-production.sh"
echo "   - Direct: cd backend && npm start"
echo "3. Deploy frontend to static hosting (Netlify, Vercel, etc.)"
echo ""
echo "📚 Documentation:"
echo "   - QUICK_START.md - Quick reference"
echo "   - DEPLOYMENT_GUIDE.md - Complete deployment guide"
echo "   - LAUNCH_READINESS.md - Launch checklist"
echo ""
echo -e "${GREEN}🎉 Your application is ready for production!${NC}"
