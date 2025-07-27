'use client'

import React from 'react'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Button } from './ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { formatAddress } from '@/lib/utils'
import { Wallet } from 'lucide-react'

export const WalletConnect: React.FC = () => {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {formatAddress(address)}
        </span>
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
        <div className="grid gap-3">
          {connectors.map((connector) => (
            <Button
              key={connector.uid}
              variant="outline"
              onClick={() => connect({ connector })}
              className="flex items-center justify-start gap-3 h-12"
            >
              <div className="text-lg">
                {connector.name === 'MetaMask' && '🦊'}
                {connector.name === 'WalletConnect' && '🔗'}
                {connector.name === 'Phantom' && '👻'}
              </div>
              <span>{connector.name}</span>
            </Button>
          ))}
        </div>
        <div className="text-xs text-muted-foreground text-center mt-4">
          Make sure you're connected to Monad Testnet
        </div>
      </DialogContent>
    </Dialog>
  )
} 