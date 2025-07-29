import { createPublicClient, createWalletClient, custom, http } from 'viem'
import { defineChain } from 'viem'
// Import the actual contract ABI
import MonkaBreakABI from '../../contracts/MonkaBreak.abi.json'

// Monad Testnet configuration
export const monadTestnet = defineChain({
  id: 10143,
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
    default: { name: 'Monad Explorer', url: 'https://testnet.monadexplorer.com' },
  },
})

// Contract address from environment or use provided address
const GAME_CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_GAME_CONTRACT_ADDRESS || '0x7DdD1840B0130e7D0357f130Db52Ad1c6A833dbd') as `0x${string}`
const GAME_CONTRACT_ABI = MonkaBreakABI

// Utility functions for MON <-> Wei conversion
export const gameUtils = {
  parseMonToWei: (mon: number): bigint => {
    return BigInt(Math.floor(mon * 1e18))
  },
  formatWeiToMon: (wei: bigint): number => {
    return Number(wei) / 1e18
  }
}

// Helper functions
const createPublicClientForBrowser = () => {
  return createPublicClient({
    chain: monadTestnet,
    transport: http()
  })
}

const createWalletClientForBrowser = () => {
  if (typeof window === 'undefined' || !window.ethereum) {
    return null
  }
  
  return createWalletClient({
    chain: monadTestnet,
    transport: custom(window.ethereum)
  })
}

// Contract interaction functions
export const smartContract = {
  // Create a new game on the blockchain (called when room is created)
  async createGame(gameId: number) {
    const walletClient = createWalletClientForBrowser()
    if (!walletClient) throw new Error('Wallet client not available')

    const [account] = await walletClient.getAddresses()
    if (!account) throw new Error('No account connected')

    // Check if game already exists
    try {
      const existingGame = await this.getGame(gameId)
      if (existingGame.creator !== '0x0000000000000000000000000000000000000000') {
        throw new Error(`Game ${gameId} already exists`)
      }
    } catch (error) {
      // Game doesn't exist, which is what we want
      console.log(`Game ${gameId} doesn't exist, proceeding with creation`)
    }

    // Call the createGame function on the smart contract
    const hash = await walletClient.writeContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: 'createGame',
      args: [BigInt(gameId)],
      account,
    })

    return hash
  },

  // Start a game with entry fee (called when creator starts game)
  async startGame(gameId: number, entryFee: bigint) {
    const walletClient = createWalletClientForBrowser()
    if (!walletClient) throw new Error('Wallet client not available')

    const [account] = await walletClient.getAddresses()
    if (!account) throw new Error('No account connected')

    // First estimate gas to check if transaction will succeed
    console.log('Estimating gas for startGame transaction...')
    try {
      const publicClient = createPublicClientForBrowser()
      const gasEstimate = await publicClient.estimateContractGas({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'startGame',
        args: [BigInt(gameId)],
        value: entryFee,
        account,
      })
      console.log('Gas estimate:', gasEstimate.toString())
    } catch (error) {
      console.error('Gas estimation failed:', error)
      throw new Error(`Transaction will fail: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }

    // Call the startGame function on the smart contract with entry fee as payment
    const hash = await walletClient.writeContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: 'startGame',
      args: [BigInt(gameId)],
      value: entryFee, // Send MON as payment
      account,
    })

    return hash
  },

  // Finalize a game with winner addresses
  async finalizeGame(gameId: number, winners: `0x${string}`[]) {
    const walletClient = createWalletClientForBrowser()
    if (!walletClient) throw new Error('Wallet client not available')

    const [account] = await walletClient.getAddresses()
    if (!account) throw new Error('No account connected')

    const hash = await walletClient.writeContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: 'finalizeGame',
      args: [BigInt(gameId), winners],
      account,
    })

    return hash
  },

  // Read game information from contract
  async getGame(gameId: number) {
    const publicClient = createPublicClientForBrowser()
    
    const result = await publicClient.readContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: 'getGame',
      args: [BigInt(gameId)],
    }) as readonly [string, bigint, bigint, bigint, boolean, boolean]

    // Result is a tuple: [creator, vault, entryFee, startBlock, started, finalized]
    return {
      creator: result[0] as `0x${string}`,
      vault: result[1],
      entryFee: result[2],
      startBlock: result[3],
      started: result[4],
      finalized: result[5],
    }
  },

  // Get minimum entry fee from contract
  async getMinEntryFee() {
    const publicClient = createPublicClientForBrowser()
    
    const result = await publicClient.readContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: 'MIN_ENTRY_FEE',
      args: [],
    })

    return result as bigint
  },

  // Get cooldown blocks from contract
  async getCooldownBlocks() {
    const publicClient = createPublicClientForBrowser()
    
    const result = await publicClient.readContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: 'COOLDOWN_BLOCKS',
      args: [],
    })

    return result as bigint
  },

  // Get current block number
  async getCurrentBlockNumber() {
    const publicClient = createPublicClientForBrowser()
    return await publicClient.getBlockNumber()
  },

  // Get current gas price
  async getGasPrice() {
    const publicClient = createPublicClientForBrowser()
    return await publicClient.getGasPrice()
  },

  // Estimate total cost for a transaction (entry fee + gas)
  async estimateTotalCost(entryFee: bigint, gameId: number) {
    const publicClient = createPublicClientForBrowser()
    
    try {
      const gasEstimate = await publicClient.estimateContractGas({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'startGame',
        args: [BigInt(gameId)],
        value: entryFee,
      })
      
      const gasPrice = await publicClient.getGasPrice()
      const gasCost = gasEstimate * gasPrice
      const totalCost = entryFee + gasCost
      
      return {
        entryFee,
        gasEstimate,
        gasPrice,
        gasCost,
        totalCost
      }
    } catch (error) {
      throw new Error(`Failed to estimate transaction cost: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  },

  // Refund a stuck game (finalize with empty winners array)
  async refundGame(gameId: number) {
    const walletClient = createWalletClientForBrowser()
    if (!walletClient) throw new Error('Wallet client not available')

    const [account] = await walletClient.getAddresses()
    if (!account) throw new Error('No account connected')

    const hash = await walletClient.writeContract({
      address: GAME_CONTRACT_ADDRESS,
      abi: GAME_CONTRACT_ABI,
      functionName: 'finalizeGame',
      args: [BigInt(gameId), []], // Empty winners array for refund
      account,
    })

    return hash
  },

  // Check if a game was properly started (for debugging)
  async checkGameStartStatus(gameId: number) {
    try {
      const gameData = await this.getGame(gameId)
      const currentBlock = await this.getCurrentBlockNumber()
      const cooldownBlocks = await this.getCooldownBlocks()
      
      return {
        gameId,
        exists: true,
        started: gameData.started,
        startBlock: Number(gameData.startBlock),
        currentBlock: Number(currentBlock),
        entryFee: gameUtils.formatWeiToMon(gameData.entryFee),
        vault: gameUtils.formatWeiToMon(gameData.vault),
        finalized: gameData.finalized,
        creator: gameData.creator,
        isProperlyStarted: gameData.started && gameData.startBlock > BigInt(0),
        canRefund: gameData.started && !gameData.finalized && 
                   Number(currentBlock) > Number(gameData.startBlock) + Number(cooldownBlocks),
        blocksUntilRefund: gameData.started && !gameData.finalized ? 
                          Math.max(0, Number(gameData.startBlock) + Number(cooldownBlocks) - Number(currentBlock)) : 0
      }
    } catch (error) {
      return {
        gameId,
        exists: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  },

  // Attempt to fix a game that wasn't properly started
  async fixGameStart(gameId: number, entryFee: bigint) {
    const walletClient = createWalletClientForBrowser()
    if (!walletClient) throw new Error('Wallet client not available')

    const [account] = await walletClient.getAddresses()
    if (!account) throw new Error('No account connected')

    // First check if game exists
    const gameData = await this.getGame(gameId)
    
    if (!gameData.started) {
      // Game exists but not started - try to start it
      console.log(`Attempting to start game ${gameId} with entry fee ${gameUtils.formatWeiToMon(entryFee)} MON`)
      
      const hash = await walletClient.writeContract({
        address: GAME_CONTRACT_ADDRESS,
        abi: GAME_CONTRACT_ABI,
        functionName: 'startGame',
        args: [BigInt(gameId)],
        value: entryFee,
        account,
      })

      return { action: 'started', hash }
    } else if (gameData.startBlock === BigInt(0)) {
      // Game is marked as started but startBlock is 0 - this is a critical error
      throw new Error(`CRITICAL: Game ${gameId} is marked as started but startBlock is 0. This indicates a blockchain state corruption.`)
    } else {
      // Game is properly started
      return { action: 'already_started', hash: null }
    }
  },

  // Wait for transaction to be mined and check its status
  async waitForTransaction(hash: `0x${string}`, maxAttempts: number = 30) {
    const publicClient = createPublicClientForBrowser()
    
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const receipt = await publicClient.waitForTransactionReceipt({ hash })
        console.log(`Transaction ${hash} mined in block ${receipt.blockNumber}`)
        
        if (receipt.status === 'success') {
          return { success: true, receipt }
        } else {
          return { success: false, receipt, error: 'Transaction failed' }
        }
      } catch (error) {
        console.log(`Waiting for transaction ${hash}... (attempt ${i + 1}/${maxAttempts})`)
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
    }
    
    throw new Error(`Transaction ${hash} did not get mined within ${maxAttempts * 2} seconds`)
  },

  // Get detailed transaction information
  async getTransactionDetails(hash: `0x${string}`) {
    const publicClient = createPublicClientForBrowser()
    
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash })
      const transaction = await publicClient.getTransaction({ hash })
      
      return {
        hash,
        status: receipt.status,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed,
        effectiveGasPrice: receipt.effectiveGasPrice,
        from: transaction.from,
        to: transaction.to,
        value: transaction.value,
        input: transaction.input
      }
    } catch (error) {
      return { hash, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }
} 