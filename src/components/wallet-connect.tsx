'use client'

import React from 'react'
import { useAccount, useConnect, useDisconnect, useChainId } from 'wagmi'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { formatAddress } from '@/lib/utils'
import { Wallet, ExternalLink } from 'lucide-react'

// Wallet information and icons
const getWalletInfo = (name: string) => {
  const walletInfo: Record<string, { icon: string; name: string; description: string; url?: string }> = {
    'MetaMask': {
      icon: '🦊',
      name: 'MetaMask',
      description: 'The most popular Web3 wallet',
      url: 'https://metamask.io'
    },
    'Phantom': {
      icon: '👻',
      name: 'Phantom',
      description: 'Popular Solana wallet with EVM support',
      url: 'https://phantom.app'
    },
    'WalletConnect': {
      icon: '🔗',
      name: 'WalletConnect',
      description: 'Connect any wallet via QR code',
      url: 'https://walletconnect.com'
    },
    'Rabby': {
      icon: '🐰',
      name: 'Rabby',
      description: 'DeBank\'s secure Web3 wallet',
      url: 'https://rabby.io'
    },
    'OKX Wallet': {
      icon: '🟢',
      name: 'OKX Wallet',
      description: 'OKX exchange wallet',
      url: 'https://www.okx.com/web3'
    }
  }
  
  return walletInfo[name] || {
    icon: '🔗',
    name,
    description: 'Web3 wallet'
  }
}

export const WalletConnect: React.FC = () => {
  const { address, isConnected, connector } = useAccount()
  const { connect, connectors, isPending, error } = useConnect()
  const { disconnect } = useDisconnect()
  const chainId = useChainId()
  const [isConnecting, setIsConnecting] = React.useState(false)
  const [recentWallets, setRecentWallets] = React.useState<string[]>([])
  
  // Check wallet availability
  const checkWalletAvailability = (connector: any) => {
    const walletId = connector.id || connector.name?.toLowerCase()
    const connectorName = connector.name?.toLowerCase()
    
    // Check for specific wallet providers
    switch (walletId) {
      case 'metamask':
      case 'injected':
        // MetaMask can be detected as 'injected' or 'metamask'
        return !!(typeof window !== 'undefined' && (window as any).ethereum?.isMetaMask)
      case 'phantom':
        return !!(typeof window !== 'undefined' && (window as any).phantom?.ethereum)
      case 'rabby':
        return !!(typeof window !== 'undefined' && (window as any).rabby)
      case 'okx':
        return !!(typeof window !== 'undefined' && (window as any).okxwallet)
      case 'walletconnect':
        return true // WalletConnect is always available
      default:
        // For MetaMask, also check if the connector name contains 'metamask'
        if (connectorName?.includes('metamask')) {
          return !!(typeof window !== 'undefined' && (window as any).ethereum?.isMetaMask)
        }
        return connector.ready && connector.installed
    }
  }
  
  // Separate installed and not installed connectors
  const installedConnectors = connectors.filter(checkWalletAvailability)
  const notInstalledConnectors = connectors.filter(connector => !checkWalletAvailability(connector))

  // Fallback: If no installed connectors are detected, show all connectors
  const displayConnectors = installedConnectors.length > 0 ? installedConnectors : connectors
  const displayNotInstalledConnectors = installedConnectors.length > 0 ? notInstalledConnectors : []

  // Debug: Log connector information
  React.useEffect(() => {
    console.log('Available connectors:', connectors.map(c => ({
      name: c.name,
      id: c.id,
      ready: c.ready,
      installed: c.installed,
      available: checkWalletAvailability(c)
    })))
  }, [connectors])

  // Load recent wallets from localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('recent-wallets')
      if (stored) {
        setRecentWallets(JSON.parse(stored))
      }
    }
  }, [])

  // Handle wallet connection with error handling
  const handleConnect = async (connector: any) => {
    setIsConnecting(true)
    try {
      await connect({ connector })
      
      // Save to recent wallets
      const walletName = connector.name
      if (typeof window !== 'undefined') {
        const current = JSON.parse(localStorage.getItem('recent-wallets') || '[]')
        const updated = [walletName, ...current.filter((w: string) => w !== walletName)].slice(0, 5)
        localStorage.setItem('recent-wallets', JSON.stringify(updated))
        setRecentWallets(updated)
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      // Error will be handled by wagmi
    } finally {
      setIsConnecting(false)
    }
  }

  if (isConnected && address) {
    const walletInfo = connector ? getWalletInfo(connector.name) : null
    const isCorrectNetwork = chainId === 10143 // Monad Testnet
    
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <div className="flex items-center gap-2">
            {walletInfo && (
              <span className="text-sm">{walletInfo.icon}</span>
            )}
            <span className="text-sm text-green-800 font-medium">
              {formatAddress(address)}
            </span>
            {!isCorrectNetwork && (
              <span className="text-xs text-amber-600 bg-amber-100 px-1 py-0.5 rounded">
                Wrong Network
              </span>
            )}
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => disconnect()}
        >
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Wallet className="h-4 w-4" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Your Wallet</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Recently Used Wallets */}
          {recentWallets.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Recently Used</h3>
              <div className="grid gap-2">
                {recentWallets.map((walletName) => {
                  const connector = displayConnectors.find(c => c.name === walletName)
                  if (!connector) return null
                  
                  const walletInfo = getWalletInfo(walletName)
                  return (
                    <Button
                      key={connector.uid}
                      variant="outline"
                      onClick={() => handleConnect(connector)}
                      disabled={isPending || isConnecting}
                      className="flex items-center justify-start w-full h-14 px-4 bg-blue-50 border-blue-200 hover:bg-blue-100"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-xl">{walletInfo.icon}</div>
                        <div className="text-left">
                          <div className="font-medium">{walletInfo.name}</div>
                          <div className="text-xs text-muted-foreground">Recently used</div>
                        </div>
                      </div>
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Installed Wallets */}
          {displayConnectors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Available Wallets</h3>
              <div className="grid gap-2">
                {displayConnectors.map((connector) => {
                  const walletInfo = getWalletInfo(connector.name)
                  
                  return (
                    <Button
                      key={connector.uid}
                      variant="outline"
                      onClick={() => handleConnect(connector)}
                      disabled={isPending || isConnecting}
                      className="flex items-center justify-start w-full h-14 px-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-xl">{walletInfo.icon}</div>
                        <div className="text-left">
                          <div className="font-medium">{walletInfo.name}</div>
                          <div className="text-xs text-muted-foreground">{walletInfo.description}</div>
                        </div>
                      </div>
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Not Installed Wallets */}
          {displayNotInstalledConnectors.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Other Wallets</h3>
              <div className="grid gap-2">
                {displayNotInstalledConnectors.map((connector) => {
                  const walletInfo = getWalletInfo(connector.name)
                  
                  return (
                    <div key={connector.uid} className="space-y-2">
                      <Button
                        variant="outline"
                        disabled
                        className="flex items-center justify-between w-full h-14 px-4 opacity-60"
                      >
                        <div className="flex items-center gap-3">
                          <div className="text-xl">{walletInfo.icon}</div>
                          <div className="text-left">
                            <div className="font-medium">{walletInfo.name}</div>
                            <div className="text-xs text-muted-foreground">{walletInfo.description}</div>
                          </div>
                        </div>
                        {walletInfo.url && (
                          <a
                            href={walletInfo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                          >
                            Install
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </Button>
                      {walletInfo.url && (
                        <div className="text-xs text-muted-foreground px-4">
                          <a
                            href={walletInfo.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-700 flex items-center gap-1"
                          >
                            Download {walletInfo.name}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-4">
            <div className="text-sm text-red-800">
              <strong>Connection Error:</strong> {error.message}
            </div>
          </div>
        )}
        
        {/* Loading State */}
        {(isPending || isConnecting) && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <div className="text-sm text-blue-800 text-center">
              Connecting to wallet...
            </div>
          </div>
        )}
        
        {/* Debug Information - Remove in production */}
        {process.env.NODE_ENV === 'development' && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mt-4">
            <div className="text-xs text-gray-600 mb-2">
              <strong>Debug Info:</strong>
            </div>
            <div className="text-xs text-gray-500 space-y-1">
              <div>Total connectors: {connectors.length}</div>
              <div>Installed connectors: {installedConnectors.length}</div>
              <div>Display connectors: {displayConnectors.length}</div>
              <div>MetaMask detected: {typeof window !== 'undefined' && (window as any).ethereum?.isMetaMask ? 'Yes' : 'No'}</div>
            </div>
          </div>
        )}
        
        <div className="text-xs text-muted-foreground text-center mt-4 space-y-2">
          <p>Make sure you're connected to Monad Testnet</p>
          <p>
            Don't have a wallet?{' '}
            <a 
              href="https://metamask.io" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Get MetaMask
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
} 