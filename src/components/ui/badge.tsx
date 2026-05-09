'use client'
import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'live' | 'success' | 'warning' | 'danger' | 'muted'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-green-900/40 text-green-400 border border-green-800/50',
    live: 'bg-red-900/40 text-red-400 border border-red-800/50',
    success: 'bg-green-900/40 text-green-400 border border-green-800/50',
    warning: 'bg-yellow-900/40 text-yellow-400 border border-yellow-800/50',
    danger: 'bg-red-900/40 text-red-400 border border-red-800/50',
    muted: 'bg-gray-900/40 text-gray-400 border border-gray-800/50',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {variant === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-red-400 live-dot" />}
      {children}
    </span>
  )
}
