'use client'

import React from 'react'
import { ConvexProvider as ConvexProviderLib } from "convex/react"
import { ConvexReactClient } from "convex/react"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL || "https://demo.convex.cloud")

export const ConvexProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <ConvexProviderLib client={convex}>
      {children}
    </ConvexProviderLib>
  )
} 