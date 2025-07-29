# MonkaBreak - Strategic On-Chain Gaming

A strategic heist game built on Monad Testnet. Join as Thieves or Police and compete for rewards.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- A Convex account and deployment
- WalletConnect project ID (optional but recommended)

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd monka-break-web3
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```bash
   NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.cloud
   NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🚀 Deployment

### Vercel Deployment

This project is optimized for Vercel deployment. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

**Quick Deploy:**
1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NEXT_PUBLIC_CONVEX_URL` | Your Convex deployment URL | Yes |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | No |

## 🎮 Game Overview

MonkaBreak is a strategic multiplayer game where players take on the role of either Thieves or Police in a high-stakes heist scenario.

### Game Modes
- **Thieves**: Work together to escape with the loot
- **Police**: Coordinate to catch the thieves before they escape

### Features
- Real-time multiplayer gameplay
- On-chain rewards and smart contract integration
- Strategic voting and coordination mechanics
- Dynamic game phases and timers
- Wallet integration for seamless Web3 experience

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: TailwindCSS, Radix UI
- **Backend**: Convex (real-time database)
- **Blockchain**: Monad Testnet, Viem, Wagmi
- **Wallets**: MetaMask, WalletConnect, Phantom, Rabby, OKX
- **Deployment**: Vercel

## 📁 Project Structure

```
monka-break-web3/
├── convex/                 # Convex backend functions
├── src/
│   ├── app/               # Next.js app router pages
│   ├── components/        # React components
│   └── lib/              # Utility functions
├── contracts/            # Smart contract artifacts
├── public/              # Static assets
└── scripts/             # Setup and deployment scripts
```

## 🔧 Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Convex Development

The backend uses Convex for real-time functionality:

- **Functions**: Located in `convex/` directory
- **Schema**: Defined in `convex/schema.ts`
- **Queries/Mutations**: Real-time data operations

### Smart Contract Integration

The game integrates with a custom smart contract on Monad Testnet:

- **Contract**: `contracts/MonkaBreak.sol`
- **Integration**: `src/lib/smart-contract.ts`
- **Utilities**: `src/lib/utils.ts`

## 🎯 Game Mechanics

### Game Flow
1. **Room Creation**: Creator sets up game parameters
2. **Player Joining**: Players join and are assigned roles
3. **Game Start**: Entry fees are collected and game begins
4. **Voting Phase**: Players vote on strategic decisions
5. **Action Phase**: Actions are executed based on votes
6. **Game End**: Winners are determined and rewards distributed

### Role Mechanics
- **Thieves**: Must coordinate to escape while avoiding police
- **Police**: Must work together to catch thieves before escape

## 🔒 Security

- All sensitive operations are validated on-chain
- Smart contract handles reward distribution
- Environment variables for sensitive configuration
- Proper error handling and user feedback

## 📈 Performance

- Optimized for Vercel deployment
- Image optimization with Next.js
- Bundle size optimization
- Real-time updates with Convex

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Check the [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment issues
- Review the [Convex documentation](https://docs.convex.dev)
- Check the [Next.js documentation](https://nextjs.org/docs)

## 🔗 Links

- [Live Demo](https://monka-break-web3.vercel.app)
- [Convex Dashboard](https://dashboard.convex.dev)
- [Monad Testnet Explorer](https://testnet-explorer.monad.xyz)
- [Vercel Dashboard](https://vercel.com/dashboard) 