import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { defineChain } from 'viem'
// Import the actual contract ABI
import MonkaBreakABI from '../../contracts/MonkaBreak.abi.json'

// Monad Testnet configuration
export const monadTestnet = defineChain({
  id: 41454,
  name: 'Monad Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'MON',
    symbol: 'MON',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet-rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: { name: 'MonadScan', url: 'https://testnet-explorer.monad.xyz' },
  },
})

// Create public client for reading
export const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
})

// Create wallet client for transactions
export const createWalletClientForBrowser = () => {
  if (typeof window === 'undefined') return null
  if (!(window as any).ethereum) return null
  
  return createWalletClient({
    chain: monadTestnet,
    transport: custom((window as any).ethereum),
  })
}

// Smart contract ABI - Using the actual deployed contract ABI
export const GAME_CONTRACT_ABI = MonkaBreakABI

// Deployed contract address from environment variables
export const GAME_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`

// Contract interaction functions
export const smartContract = {
  // Create a new game on the blockchain and lock entry fee
  async createGameWithFee(entryFee: bigint) {
    const walletClient = createWalletClientForBrowser()
    if (!walletClient) throw new Error('Wallet client not available')

    const [account] = await walletClient.getAddresses()
    if (!account) throw new Error('No account connected')

    // Call the createGame function on the smart contract with entry fee as payment
    const hash = await walletClient.writeContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: 'createGame',
      args: [entryFee], // Pass entry fee as parameter
      value: entryFee, // Send MON as payment
      account,
    })

    return hash
  },

  // Join an existing game
  async joinGame(gameId: bigint, role: 0 | 1, entryFee: bigint) {
    const walletClient = createWalletClientForBrowser()
    if (!walletClient) throw new Error('Wallet client not available')

    const [account] = await walletClient.getAddresses()
    if (!account) throw new Error('No account connected')

    const hash = await walletClient.writeContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: 'joinGame',
      args: [gameId, role],
      value: entryFee,
      account,
    })

    return hash
  },

  // Commit a move (hashed) to the blockchain
  async commitMove(gameId: bigint, round: number, moveHash: `0x${string}`) {
    const walletClient = createWalletClientForBrowser()
    if (!walletClient) throw new Error('Wallet client not available')

    const [account] = await walletClient.getAddresses()
    if (!account) throw new Error('No account connected')

    const hash = await walletClient.writeContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: 'commitMove',
      args: [gameId, round, moveHash],
      account,
    })

    return hash
  },

  // Reveal a move (after commit phase)
  async revealMove(gameId: bigint, round: number, move: string, nonce: bigint) {
    const walletClient = createWalletClientForBrowser()
    if (!walletClient) throw new Error('Wallet client not available')

    const [account] = await walletClient.getAddresses()
    if (!account) throw new Error('No account connected')

    const hash = await walletClient.writeContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: 'revealMove',
      args: [gameId, round, move, nonce],
      account,
    })

    return hash
  },

  // Finalize game and distribute rewards
  async finalizeGame(gameId: bigint) {
    const walletClient = createWalletClientForBrowser()
    if (!walletClient) throw new Error('Wallet client not available')

    const [account] = await walletClient.getAddresses()
    if (!account) throw new Error('No account connected')

    const hash = await walletClient.writeContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: 'finalizeGame',
      args: [gameId],
      account,
    })

    return hash
  },

  // Get game state from blockchain
  async getGameState(gameId: bigint) {
    const result = await publicClient.readContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: 'getGameState',
      args: [gameId],
    })

    return result
  },

  // Get minimum entry fee from contract
  async getMinEntryFee(): Promise<bigint> {
    const result = await publicClient.readContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: 'MIN_ENTRY_FEE',
      args: [],
    })

    return result as bigint
  },
}

// Utility functions for move hashing (commit-reveal scheme)
export const gameUtils = {
  // Generate a random nonce for move hashing
  generateNonce(): bigint {
    return BigInt(Math.floor(Math.random() * 1000000000))
  },

  // Hash a move with nonce for commit phase
  async hashMove(move: string, nonce: bigint): Promise<`0x${string}`> {
    const encoder = new TextEncoder()
    const data = encoder.encode(move + nonce.toString())
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return `0x${hash}`
  },

  // Convert MON amount to wei (18 decimals)
  parseMonToWei(mon: number): bigint {
    return BigInt(Math.floor(mon * 1e18))
  },

  // Convert wei to MON amount
  formatWeiToMon(wei: bigint): number {
    return Number(wei) / 1e18
  },
} 