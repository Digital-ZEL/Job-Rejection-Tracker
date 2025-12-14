#!/bin/bash
# Start script for First Job Tracker Backend (Unix/Linux/macOS)

echo "🚀 Starting First Job Tracker Backend..."
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    if [ -f "backend/package.json" ]; then
        cd backend
    else
        echo "❌ Error: Cannot find package.json"
        echo "   Please run this script from the project root or backend directory"
        exit 1
    fi
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed"
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed"
    echo "   Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "⚠️  Dependencies not found"
    echo "   Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed successfully"
    echo ""
fi

# Test setup
echo "🔍 Testing setup..."
npm run test-setup
echo ""

# Start the server
echo "🎮 Starting server..."
echo "   Press Ctrl+C to stop the server"
echo ""
npm run dev
