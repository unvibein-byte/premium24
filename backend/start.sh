#!/bin/bash
# Start Backend - Premium24

echo "======================================"
echo "Premium24 Backend Startup"
echo "======================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found"
    echo "Please run this from the backend/ directory"
    exit 1
fi

echo "✅ Found package.json"

# Check .env
if [ ! -f ".env" ]; then
    echo "⚠️  .env not found!"
    echo "Creating from .env.example..."
    cp .env.example .env
    echo "✅ .env created - Please update with your credentials"
fi

# Check node_modules
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ npm install failed"
        exit 1
    fi
fi

echo "✅ Dependencies ready"
echo ""
echo "🚀 Starting backend on port 4000..."
echo "Press Ctrl+C to stop"
echo ""

npm run dev
