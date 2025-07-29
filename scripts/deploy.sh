#!/bin/bash

# MonkaBreak Web3 - Vercel Deployment Script
# This script helps prepare the project for Vercel deployment

set -e

echo "🚀 Preparing MonkaBreak Web3 for Vercel deployment..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Please run this script from the project root."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Error: Node.js 18 or higher is required. Current version: $(node --version)"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Type check
echo "🔍 Running TypeScript type check..."
npm run type-check

# Lint check
echo "🔍 Running ESLint..."
npm run lint

# Build check
echo "🏗️ Building project..."
npm run build

echo "✅ Build successful!"

# Check for required environment variables
echo "🔧 Checking environment variables..."

if [ -z "$NEXT_PUBLIC_CONVEX_URL" ]; then
    echo "⚠️  Warning: NEXT_PUBLIC_CONVEX_URL is not set"
    echo "   Please set this environment variable in your Vercel dashboard"
else
    echo "✅ NEXT_PUBLIC_CONVEX_URL is set"
fi

if [ -z "$NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID" ]; then
    echo "⚠️  Warning: NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set"
    echo "   This is optional but recommended for better wallet support"
else
    echo "✅ NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is set"
fi

echo ""
echo "🎉 Project is ready for deployment!"
echo ""
echo "📋 Next steps:"
echo "1. Push your code to GitHub"
echo "2. Connect your repository to Vercel"
echo "3. Set environment variables in Vercel dashboard:"
echo "   - NEXT_PUBLIC_CONVEX_URL"
echo "   - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID (optional)"
echo "4. Deploy!"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT.md" 