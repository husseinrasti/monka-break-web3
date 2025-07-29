'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAccount } from 'wagmi'
import { useMutation } from 'convex/react'
import { api } from '@/../convex/_generated/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WalletConnect } from '@/components/wallet-connect'
import { ArrowLeft, Target, Shield, Loader2 } from 'lucide-react'
import { smartContract } from '@/lib/smart-contract'
import { Id } from '@/../convex/_generated/dataModel'

// Convert roomId string to deterministic number for smart contract
const roomIdToNumber = (roomId: string): number => {
  let hash = 0;
  for (let i = 0; i < roomId.length; i++) {
    const char = roomId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export default function CreateGamePage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const createRoom = useMutation(api.rooms.createRoom)
  const updateRoomGameId = useMutation(api.rooms.updateRoomGameId)
  const deleteRoom = useMutation(api.rooms.deleteRoom)

  const [nickname, setNickname] = useState('')
  const [selectedRole, setSelectedRole] = useState<'thief' | 'police'>('thief')
  const [isLoading, setIsLoading] = useState(false)
  const [creationStep, setCreationStep] = useState<'idle' | 'convex' | 'contract' | 'complete'>('idle')

  const handleCreateRoom = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first')
      return
    }

    setIsLoading(true)
    setCreationStep('convex')
    
    let roomId: Id<'rooms'> | null = null
    
    try {
      // Step 1: Create room in Convex
      console.log('Creating room in Convex...')
      const result = await createRoom({
        creator: address,
        nickname: nickname || undefined,
        role: selectedRole,
      })
      
      roomId = result.roomId
      console.log('Room created in Convex:', { roomId: result.roomId, roomCode: result.roomCode })
      
      // Step 2: Create game on smart contract
      setCreationStep('contract')
      console.log('Creating game on smart contract...')
      
      // Generate deterministic gameId from roomId
      const gameId = roomIdToNumber(result.roomId)
      
      console.log('Game ID generation:', {
        roomId: result.roomId,
        gameId,
        gameIdHex: '0x' + gameId.toString(16)
      })
      
      // Check if game already exists on blockchain
      console.log('Checking if game already exists on blockchain...')
      try {
        const existingGame = await smartContract.getGame(gameId)
        if (existingGame.creator !== '0x0000000000000000000000000000000000000000') {
          throw new Error(`Game ID ${gameId} already exists on blockchain. Please try again.`)
        }
      } catch (error) {
        // Game doesn't exist, which is what we want
        console.log(`Game ${gameId} doesn't exist on blockchain, proceeding with creation`)
      }
      
      // Create game on smart contract with retry logic
      let createHash: `0x${string}`
      let createResult: any
      let retryCount = 0
      const maxRetries = 2
      
      while (retryCount <= maxRetries) {
        try {
          createHash = await smartContract.createGame(gameId)
          console.log(`Game creation attempt ${retryCount + 1} with hash:`, createHash)
          
          // Wait for creation transaction to be mined
          console.log('Waiting for creation transaction to be mined...')
          createResult = await smartContract.waitForTransaction(createHash)
          if (createResult.success) {
            console.log('✅ Game creation transaction successful')
            break
          } else {
            throw new Error(`Game creation failed: ${createResult.error}`)
          }
        } catch (error) {
          retryCount++
          console.error(`Create game attempt ${retryCount} failed:`, error)
          
          if (retryCount > maxRetries) {
            throw error
          }
          
          console.log(`Retrying game creation (attempt ${retryCount + 1}/${maxRetries + 1})...`)
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
      
      // Verify the game was created correctly on-chain
      console.log('Verifying game creation on blockchain...')
      const gameData = await smartContract.getGame(gameId)
      console.log('Game data from blockchain:', gameData)
      
      if (gameData.creator !== address) {
        throw new Error('Game creation failed - creator address mismatch')
      }
      
      console.log('✅ Game successfully created on blockchain with gameId:', gameId)
      
      // Step 3: Update Convex room with gameId
      console.log('Updating Convex room with gameId...')
      await updateRoomGameId({
        roomId: result.roomId,
        gameId: gameId,
      })
      
      setCreationStep('complete')
      
      // Navigate to the game room
      router.push(`/game/${result.roomId}?code=${result.roomCode}`)
      
    } catch (error) {
      console.error('Failed to create room:', error)
      
      // Clean up the Convex room if it was created but smart contract creation failed
      if (roomId && creationStep === 'contract') {
        try {
          console.log('Cleaning up Convex room due to smart contract creation failure...')
          await deleteRoom({
            roomId: roomId,
            creatorAddress: address!,
          })
          console.log('✅ Convex room cleaned up successfully')
        } catch (cleanupError) {
          console.error('Failed to clean up Convex room:', cleanupError)
          // Don't show cleanup errors to user, just log them
        }
      }
      
      // Provide specific error messages for different failure scenarios
      let errorMessage = 'Failed to create room'
      if (error instanceof Error) {
        if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction was rejected by user. Please try again.'
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        } else if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient MON balance for gas fees. Please add more MON to your wallet.'
        } else if (error.message.includes('already exists')) {
          errorMessage = 'Game ID already exists. This room ID conflicts with an existing game. Please try again.'
        } else if (error.message.includes('Game creation failed')) {
          errorMessage = 'Failed to create game on blockchain. Please check your wallet connection and try again.'
        } else {
          errorMessage = error.message
        }
      }
      
      alert(errorMessage)
    } finally {
      setIsLoading(false)
      setCreationStep('idle')
    }
  }

  const getLoadingText = () => {
    switch (creationStep) {
      case 'convex':
        return 'Creating room...'
      case 'contract':
        return 'Creating game on blockchain...'
      case 'complete':
        return 'Redirecting to game...'
      default:
        return 'Creating Game Room'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/20 to-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => router.push('/')}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="text-2xl">🥷</div>
            <h1 className="text-2xl font-bold text-primary">MonkaBreak</h1>
          </div>
          <WalletConnect />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12 max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Create New Game</h2>
          <p className="text-muted-foreground">
            Set up your game room and choose your role
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Game Setup</CardTitle>
            <CardDescription>
              Configure your game settings and join as your preferred role
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Nickname */}
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname (Optional)</Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Enter your game nickname"
                maxLength={20}
              />
            </div>

            {/* Role Selection */}
            <div className="space-y-3">
              <Label>Choose Your Role</Label>
              <div className="grid grid-cols-2 gap-3">
                <Card 
                  className={`cursor-pointer transition-colors ${
                    selectedRole === 'thief' 
                      ? 'border-primary bg-primary/10' 
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedRole('thief')}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">🥷</div>
                    <div className="font-medium">Thief</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Plan the heist
                    </div>
                  </CardContent>
                </Card>

                <Card 
                  className={`cursor-pointer transition-colors ${
                    selectedRole === 'police' 
                      ? 'border-accent bg-accent/10' 
                      : 'hover:border-accent/50'
                  }`}
                  onClick={() => setSelectedRole('police')}
                >
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl mb-2">👮</div>
                    <div className="font-medium">Police</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Stop the heist
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Create Button */}
            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleCreateRoom}
              disabled={isLoading || !isConnected}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {getLoadingText()}
                </>
              ) : !isConnected ? (
                'Connect Wallet to Create'
              ) : (
                <>
                  <Target className="mr-2 h-5 w-5" />
                  Create Game Room
                </>
              )}
            </Button>

            {!isConnected && (
              <div className="text-center">
                <WalletConnect />
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
} 