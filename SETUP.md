# MonkaBreak - Setup Instructions

## 🚀 Quick Start

### Option 1: Automated Setup
Run the setup script:
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
npm run dev
```

### Option 2: Manual Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your values
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Open the App**
   Visit [http://localhost:3000](http://localhost:3000)

## 🔧 Full Backend Setup

### Convex Backend
1. **Install Convex CLI**
   ```bash
   npm install -g convex
   ```

2. **Login and Initialize**
   ```bash
   npx convex login
   npx convex dev
   ```
   This will provide your `NEXT_PUBLIC_CONVEX_URL`

3. **Update Environment**
   Add the Convex URL to your `.env.local`:
   ```env
   NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
   ```

### Wallet Integration
1. **Get WalletConnect Project ID**
   - Visit [cloud.walletconnect.com](https://cloud.walletconnect.com)
   - Create a project and get your Project ID
   - Add to `.env.local`:
   ```env
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
   ```

### Smart Contract (Advanced)
1. **Deploy Game Contract**
   - Deploy the MonkaBreak contract to Monad Testnet
   - Update contract address in `.env.local`:
   ```env
   NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=0x...
   ```

## 🎮 Testing the App

### Basic Features (Works Immediately)
- ✅ Home page with game creation/joining UI
- ✅ Create game page with entry fee and role selection
- ✅ Join game page with room code input
- ✅ Game room interface with player lists
- ✅ Voting and commit phases UI
- ✅ Results and finalization screens
- ✅ Mobile-responsive design
- ✅ Dark theme with MonkaBreak styling

### Advanced Features (Requires Setup)
- 🔧 Real-time game synchronization (needs Convex)
- 🔧 Persistent game data (needs Convex)
- 🔧 Wallet connections (needs WalletConnect ID)
- 🔧 Blockchain interactions (needs smart contract)

## 🛠 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint

# Start Convex development
npx convex dev

# Open Convex dashboard
npx convex dashboard
```

## 📁 Project Structure

```
monka-break-web3/
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── create/         # Create game page
│   │   ├── join/           # Join game page
│   │   ├── game/[roomId]/  # Game room page
│   │   └── providers/      # React providers
│   ├── components/         # Reusable UI components
│   │   ├── ui/            # ShadCN UI components
│   │   ├── game-*         # Game-specific components
│   │   └── wallet-connect # Wallet connection
│   └── lib/               # Utilities and helpers
├── convex/                # Convex backend functions
│   ├── schema.ts         # Database schema
│   ├── rooms.ts          # Room management
│   └── votes.ts          # Voting system
└── scripts/              # Setup and utility scripts
```

## 🐛 Troubleshooting

### App Won't Start
- Ensure Node.js 18+ is installed
- Run `npm install` to install dependencies
- Check for port conflicts (default: 3000)

### Convex Errors
- Make sure you're logged in: `npx convex login`
- Regenerate files: `npx convex dev`
- Check environment variables

### Wallet Connection Issues
- Ensure MetaMask or compatible wallet is installed
- Switch to Monad Testnet (Chain ID: 10143)
- Get MON tokens for testing

### Build Errors
- Clear `.next` directory: `rm -rf .next`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check TypeScript errors: `npm run lint`

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on git push

### Other Platforms
- Build: `npm run build`
- Start: `npm start`
- Ensure environment variables are set

## 📞 Support

If you encounter issues:
1. Check this setup guide
2. Review the main README.md
3. Check GitHub issues
4. Create a new issue with error details

---

Built with ❤️ for the Monad ecosystem 