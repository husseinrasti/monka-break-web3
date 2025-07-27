'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

// Mock Multisynq implementation for now
// In a real implementation, you would use the actual Multisynq SDK

interface MultisynqContextType {
  isConnected: boolean
  joinRoom: (roomId: string) => void
  leaveRoom: () => void
  sendMessage: (type: string, data: any) => void
  onMessage: (callback: (type: string, data: any) => void) => void
}

const MultisynqContext = createContext<MultisynqContextType | null>(null)

export const useMultisynq = () => {
  const context = useContext(MultisynqContext)
  if (!context) {
    throw new Error('useMultisynq must be used within MultisynqProvider')
  }
  return context
}

export const MultisynqProvider = ({ children }: { children: React.ReactNode }) => {
  const [isConnected, setIsConnected] = useState(false)
  const [currentRoom, setCurrentRoom] = useState<string | null>(null)
  const [messageCallback, setMessageCallback] = useState<((type: string, data: any) => void) | null>(null)

  const joinRoom = (roomId: string) => {
    console.log(`[Multisynq] Joining room: ${roomId}`)
    setCurrentRoom(roomId)
    setIsConnected(true)
    
    // Simulate real-time connection
    // In real implementation, this would connect to Multisynq servers
  }

  const leaveRoom = () => {
    console.log(`[Multisynq] Leaving room: ${currentRoom}`)
    setCurrentRoom(null)
    setIsConnected(false)
  }

  const sendMessage = (type: string, data: any) => {
    if (!isConnected || !currentRoom) {
      console.warn('[Multisynq] Cannot send message - not connected to room')
      return
    }
    
    console.log(`[Multisynq] Sending message:`, { type, data })
    
    // In real implementation, this would send to Multisynq
    // For now, simulate echo back to demonstrate real-time updates
    setTimeout(() => {
      if (messageCallback) {
        messageCallback(type, data)
      }
    }, 100)
  }

  const onMessage = (callback: (type: string, data: any) => void) => {
    setMessageCallback(callback)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (isConnected) {
        leaveRoom()
      }
    }
  }, [isConnected])

  const value: MultisynqContextType = {
    isConnected,
    joinRoom,
    leaveRoom,
    sendMessage,
    onMessage,
  }

  return (
    <MultisynqContext.Provider value={value}>
      {children}
    </MultisynqContext.Provider>
  )
}

// Game-specific Multisynq hooks
export const useGameSync = (roomId: string) => {
  const multisynq = useMultisynq()
  
  useEffect(() => {
    if (roomId) {
      multisynq.joinRoom(roomId)
      
      return () => {
        multisynq.leaveRoom()
      }
    }
  }, [roomId, multisynq])

  const broadcastVote = (vote: { player: string; choice: string; round: number }) => {
    multisynq.sendMessage('vote_update', vote)
  }

  const broadcastPlayerJoin = (player: { address: string; nickname?: string; role: string }) => {
    multisynq.sendMessage('player_join', player)
  }

  const broadcastGamePhase = (phase: { gamePhase: string; timeRemaining?: number; round?: number }) => {
    multisynq.sendMessage('phase_update', phase)
  }

  return {
    isConnected: multisynq.isConnected,
    broadcastVote,
    broadcastPlayerJoin,
    broadcastGamePhase,
    onMessage: multisynq.onMessage,
  }
} 