'use client'

import React from 'react'
import { WagmiProvider, createConfig, http } from 'wagmi'
import { defineChain } from 'viem'
import { 
  metaMask, 
  walletConnect,
  injected
} from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Custom wallet connectors with better detection
const createCustomConnector = (name: string, id: string) => {
  return injected({
    target: {
      id,
      name,
      provider: typeof window !== 'undefined' ? 
        (window as any)[id] || 
        (window as any).ethereum : 
        undefined,
    },
  })
}

// Check if wallet is available
const isWalletAvailable = (walletId: string): boolean => {
  if (typeof window === 'undefined') return false
  
  // Check for specific wallet providers
  switch (walletId) {
    case 'metamask':
      return !!(window as any).ethereum?.isMetaMask
    case 'phantom':
      return !!(window as any).phantom?.ethereum
    case 'rabby':
      return !!(window as any).rabby
    case 'okx':
      return !!(window as any).okxwallet
    default:
      return false
  }
}

// Monad Testnet configuration
const monadTestnet = defineChain({
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
    default: { name: 'MonadScan', url: 'https://testnet-explorer.monad.xyz' },
  },
})

const config = createConfig({
  chains: [monadTestnet],
  connectors: [
    metaMask(),
    createCustomConnector('Phantom', 'phantom'),
    walletConnect({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
    }),
    createCustomConnector('Rabby', 'rabby'),
    createCustomConnector('OKX Wallet', 'okx'),
  ],
  transports: {
    [monadTestnet.id]: http(),
  },
})

const queryClient = new QueryClient()

export const WalletProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  )
} 