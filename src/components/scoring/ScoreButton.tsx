'use client'
import { cn } from '@/lib/utils'

interface ScoreButtonProps {
  label: string
  sublabel?: string
  onClick: () => void
  variant?: 'run' | 'boundary' | 'six' | 'extra' | 'wicket' | 'undo' | 'dot'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
}

const variants = {
  run: 'bg-[#1a2e1a] hover:bg-[#22c55e]/20 border border-green-800 text-green-300',
  boundary: 'bg-green-900/60 hover:bg-green-800 border border-green-600 text-green-300 font-bold',
  six: 'bg-purple-900/60 hover:bg-purple-800 border border-purple-600 text-purple-300 font-bold',
  extra: 'bg-yellow-900/40 hover:bg-yellow-800/60 border border-yellow-700 text-yellow-300',
  wicket: 'bg-red-900/60 hover:bg-red-800 border border-red-600 text-red-300 font-bold',
  undo: 'bg-gray-900/60 hover:bg-gray-700 border border-gray-600 text-gray-400',
  dot: 'bg-[#111b11] hover:bg-[#1a2e1a] border border-green-900 text-green-600',
}

const sizes = {
  sm: 'h-14 text-lg rounded-xl',
  md: 'h-20 text-2xl rounded-2xl',
  lg: 'h-24 text-3xl rounded-2xl',
}

export function ScoreButton({
  label,
  sublabel,
  onClick,
  variant = 'run',
  size = 'md',
  disabled,
}: ScoreButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'score-btn flex flex-col items-center justify-center w-full font-bold',
        'transition-all duration-75 active:scale-90',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
      )}
    >
      <span>{label}</span>
      {sublabel && (
        <span className="text-xs font-normal opacity-70 mt-0.5">{sublabel}</span>
      )}
    </button>
  )
}
