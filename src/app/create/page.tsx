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
import { ArrowLeft, Target, Shield } from 'lucide-react'

export default function CreateGamePage() {
  const router = useRouter()
  const { address, isConnected } = useAccount()
  const createRoom = useMutation(api.rooms.createRoom)

  const [entryFee, setEntryFee] = useState('2')
  const [nickname, setNickname] = useState('')
  const [selectedRole, setSelectedRole] = useState<'thief' | 'police'>('thief')
  const [isLoading, setIsLoading] = useState(false)

  const handleCreateRoom = async () => {
    if (!isConnected || !address) {
      alert('Please connect your wallet first')
      return
    }

    const fee = parseFloat(entryFee)
    if (fee < 2) {
      alert('Minimum entry fee is 2 MON')
      return
    }

    setIsLoading(true)
    try {
              const result = await createRoom({
        creator: address,
        entryFee: fee,
        nickname: nickname || undefined,
        role: selectedRole,
      })

      // Navigate to the game room
      router.push(`/game/${result.roomId}?code=${result.roomCode}`)
    } catch (error) {
      console.error('Failed to create room:', error)
      alert('Failed to create room. Please try again.')
    } finally {
      setIsLoading(false)
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
            {/* Entry Fee */}
            <div className="space-y-2">
              <Label htmlFor="entryFee">Entry Fee (MON)</Label>
              <Input
                id="entryFee"
                type="number"
                min="2"
                step="0.1"
                value={entryFee}
                onChange={(e) => setEntryFee(e.target.value)}
                placeholder="Minimum 2 MON"
              />
              <p className="text-xs text-muted-foreground">
                Higher entry fees create larger prize pools
              </p>
            </div>

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
                'Creating Room...'
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