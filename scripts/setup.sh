#!/bin/bash

echo "🎮 MonkaBreak Setup Script"
echo "=========================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Create .env.local if it doesn't exist
if [ ! -f ".env.local" ]; then
    echo "⚙️  Creating .env.local file..."
    cp .env.example .env.local 2>/dev/null || cat > .env.local << EOF
# Convex Backend (you'll need to run 'npx convex dev' to get your URL)
NEXT_PUBLIC_CONVEX_URL=https://demo.convex.cloud

# WalletConnect Project ID (optional for development)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=demo-project-id

# Multisynq API Key (optional for development)
NEXT_PUBLIC_MULTISYNQ_API_KEY=demo-api-key

# Smart Contract Address (will be set after contract deployment)
NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
EOF
    echo "✅ Environment file created"
else
    echo "✅ Environment file already exists"
fi

# Check if Convex is set up
if [ ! -d "convex/_generated" ]; then
    echo "🔧 Convex generated files missing - they've been created as placeholders"
    echo "   Run 'npx convex dev' in a separate terminal to set up the real backend"
else
    echo "✅ Convex files found"
fi

echo ""
echo "🚀 Setup complete! To run the app:"
echo ""
echo "1. Start the Next.js development server:"
echo "   npm run dev"
echo ""
echo "2. (Optional) Set up Convex backend in a separate terminal:"
echo "   npx convex dev"
echo ""
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "📝 Notes:"
echo "- The app will work with placeholder data initially"
echo "- Set up Convex for real backend functionality"
echo "- Deploy a smart contract for blockchain features"
echo "- Get WalletConnect Project ID for wallet connections"
echo "" 