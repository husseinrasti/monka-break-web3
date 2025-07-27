# MonkaBreak - Strategic On-Chain Gaming

A strategic heist game built on Monad Testnet where players compete as Thieves or Police in real-time rounds for MON rewards.

## 🎮 Game Overview

MonkaBreak is a real-time multiplayer game where:
- **Thieves** plan the perfect heist by selecting paths through 4 strategic rounds
- **Police** work together to predict and block the thieves' escape routes
- Entry fees create prize pools distributed to winning teams
- All game moves are committed to the Monad blockchain for transparency

## 🛠 Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: TailwindCSS + ShadCN UI
- **Wallet Integration**: viem + wagmi
- **Real-time Sync**: Multisynq
- **Backend/DB**: Convex
- **Blockchain**: Monad Testnet

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A wallet (MetaMask recommended)
- MON tokens on Monad Testnet

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd monka-break-web3
npm install
```

### 2. Environment Setup

Copy the environment template:

```bash
cp .env.example .env.local
```

Fill in your environment variables:

```env
# Convex Backend
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud

# WalletConnect Project ID (get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_here

# Multisynq API Key (get from https://multisynq.io)
NEXT_PUBLIC_MULTISYNQ_API_KEY=your_api_key_here

# Smart Contract Address (deploy the game contract)
NEXT_PUBLIC_GAME_CONTRACT_ADDRESS=0x...
```

### 3. Convex Setup

Install Convex CLI:

```bash
npm install -g convex
```

Login and initialize:

```bash
npx convex login
npx convex dev
```

This will:
- Create a new Convex project
- Generate the database schema
- Deploy your backend functions
- Provide the `NEXT_PUBLIC_CONVEX_URL`

### 4. Smart Contract Deployment

The game requires a smart contract deployed on Monad Testnet. You'll need to:

1. Deploy the MonkaBreak game contract
2. Set the contract address in your environment variables
3. Ensure your wallet has MON tokens for gas fees

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play!

## 🎯 Game Flow

### 1. Create/Join Room
- Players create game rooms with entry fees (minimum 2 MON)
- Others join using 6-character room codes
- Choose between Thief or Police roles
- Minimum 2 players per team required

### 2. Game Rounds (4 total)
Each round consists of:
- **20s Voting Phase**: Teams select paths/blocking strategies
- **10s Commit Phase**: Moves are committed to blockchain
- **5s Cooldown**: Results processed, next round begins

### 3. Victory Conditions
- **Thieves Win**: Successfully escape through an unblocked path
- **Police Win**: Block all thief escape routes
- Prize pool distributed among winning team members

## 📱 Features

- **Mobile-First Design**: Optimized for mobile gaming
- **Real-Time Sync**: Live updates using Multisynq
- **Wallet Integration**: Multiple wallet support (MetaMask, WalletConnect, etc.)
- **Dark Theme**: Immersive heist-inspired UI
- **Smart Contract Integration**: Transparent, on-chain game resolution

## 🏗 Project Structure

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
└── public/               # Static assets
```

## 🔧 Key Components

### Backend (Convex)
- **Rooms**: Game room creation, joining, player management
- **Votes**: Voting system with commit phases
- **Real-time subscriptions** for live game updates

### Frontend (React/Next.js)
- **Game Flow**: Multi-phase game rounds with timers
- **Wallet Integration**: Seamless Web3 wallet connection
- **Real-time UI**: Live updates during gameplay
- **Mobile Responsive**: Touch-friendly interface

### Smart Contract Integration
- **Game Finalization**: On-chain reward distribution
- **Move Commits**: Blockchain-verified game moves
- **Prize Pool Management**: Automated reward calculation

## 🎨 Design System

The app uses a dark, heist-inspired color palette:
- **Primary**: `#836EF9` (vibrant purple)
- **Secondary**: `#200052` (deep purple-black)
- **Accent**: `#A0055D` (danger/elimination)
- **Background**: `#0E100F` (dark grey)
- **Text**: `#FBFAF9` (off-white)

## 🚧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Convex Commands

- `npx convex dev` - Start Convex development
- `npx convex deploy` - Deploy to production
- `npx convex dashboard` - Open Convex dashboard

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🎯 Roadmap

- [ ] Tournament mode with brackets
- [ ] Spectator mode for completed games
- [ ] Player statistics and leaderboards
- [ ] Custom game modes and rule variations
- [ ] Mobile app (React Native)

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Join our Discord community
- Check the documentation

---

Built with ❤️ for the Monad ecosystem 