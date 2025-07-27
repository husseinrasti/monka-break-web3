import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs))
}

export const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export const formatMON = (amount: number) => {
  return `${amount} MON`
}

export const getRoleColor = (role: 'thief' | 'police') => {
  return role === 'thief' ? 'text-primary' : 'text-accent'
}

export const getRoleIcon = (role: 'thief' | 'police') => {
  return role === 'thief' ? '🥷' : '👮'
} 