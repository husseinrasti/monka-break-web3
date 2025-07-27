import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { defineChain } from 'viem'

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

// Smart contract ABI - This would be your actual deployed contract ABI
export const GAME_CONTRACT_ABI = [
  // Example functions - replace with your actual contract ABI
  {
    name: 'createGame',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'entryFee', type: 'uint256' },
      { name: 'maxPlayers', type: 'uint8' },
    ],
    outputs: [{ name: 'gameId', type: 'uint256' }],
  },
  {
    name: 'joinGame',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'gameId', type: 'uint256' },
      { name: 'role', type: 'uint8' }, // 0 = thief, 1 = police
    ],
    outputs: [],
  },
  {
    name: 'commitMove',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'gameId', type: 'uint256' },
      { name: 'round', type: 'uint8' },
      { name: 'moveHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'revealMove',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'gameId', type: 'uint256' },
      { name: 'round', type: 'uint8' },
      { name: 'move', type: 'string' },
      { name: 'nonce', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'finalizeGame',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'gameId', type: 'uint256' }],
    outputs: [],
  },
  {
    name: 'getGameState',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'gameId', type: 'uint256' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'creator', type: 'address' },
          { name: 'entryFee', type: 'uint256' },
          { name: 'prizePool', type: 'uint256' },
          { name: 'isActive', type: 'bool' },
          { name: 'currentRound', type: 'uint8' },
          { name: 'winningTeam', type: 'uint8' },
        ],
      },
    ],
  },
] as const

export const GAME_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000") as `0x${string}`

// Contract interaction functions
export const smartContract = {
  // Create a new game on the blockchain
  async createGame(entryFee: bigint, maxPlayers: number = 8) {
    const walletClient = createWalletClientForBrowser()
    if (!walletClient) throw new Error('Wallet client not available')

    const [account] = await walletClient.getAddresses()
    if (!account) throw new Error('No account connected')

    const hash = await walletClient.writeContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: 'createGame',
      args: [entryFee, maxPlayers],
      value: entryFee,
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