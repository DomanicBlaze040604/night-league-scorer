import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Convert snake_case string to camelCase
function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
}

// Recursively transform all object keys from snake_case to camelCase
export function transformKeys<T>(obj: unknown): T {
  if (Array.isArray(obj)) return obj.map(transformKeys) as unknown as T
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [snakeToCamel(k), transformKeys(v)])
    ) as T
  }
  return obj as T
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatOvers(balls: number): string {
  const overs = Math.floor(balls / 6)
  const rem = balls % 6
  return rem === 0 ? `${overs}.0` : `${overs}.${rem}`
}

export function oversToFloat(overs: number, balls: number): number {
  return overs + balls / 6
}

export function calcRunRate(runs: number, balls: number): number {
  if (balls === 0) return 0
  return (runs / balls) * 6
}

export function calcRequiredRunRate(runsNeeded: number, ballsLeft: number): number {
  if (ballsLeft === 0) return 999
  return (runsNeeded / ballsLeft) * 6
}

export function calcNRR(
  runsFor: number, oversFor: number,
  runsAgainst: number, oversAgainst: number,
): number {
  if (oversFor === 0 || oversAgainst === 0) return 0
  return (runsFor / oversFor) - (runsAgainst / oversAgainst)
}

export function formatNRR(nrr: number): string {
  if (nrr > 0) return `+${nrr.toFixed(3)}`
  return nrr.toFixed(3)
}

export function formatStrikeRate(runs: number, balls: number): string {
  if (balls === 0) return '0.00'
  return ((runs / balls) * 100).toFixed(1)
}

export function formatEconomy(runs: number, balls: number): string {
  if (balls === 0) return '0.00'
  return ((runs / balls) * 6).toFixed(1)
}

export function formatBowlingFigures(wickets: number, runs: number): string {
  return `${wickets}/${runs}`
}

export function generateCommentary(ball: {
  runs: number
  isWide?: boolean
  isNoBall?: boolean
  isBye?: boolean
  isLegBye?: boolean
  isWicket?: boolean
  wicketType?: string
  batsmanName: string
  bowlerName: string
  dismissedBatsmanName?: string
  fielderName?: string
}): string {
  if (ball.isWicket) {
    const dismissed = ball.dismissedBatsmanName || ball.batsmanName
    switch (ball.wicketType) {
      case 'BOWLED': return `OUT! ${dismissed} is BOWLED by ${ball.bowlerName}!`
      case 'CAUGHT': return `OUT! ${dismissed} CAUGHT by ${ball.fielderName || 'fielder'} off ${ball.bowlerName}!`
      case 'LBW': return `OUT! ${dismissed} LBW b ${ball.bowlerName}!`
      case 'RUN_OUT': return `OUT! ${dismissed} RUN OUT!`
      case 'STUMPED': return `OUT! ${dismissed} STUMPED by ${ball.fielderName || 'keeper'} b ${ball.bowlerName}!`
      case 'HIT_WICKET': return `OUT! ${dismissed} HIT WICKET b ${ball.bowlerName}!`
      default: return `OUT! ${dismissed} is dismissed by ${ball.bowlerName}!`
    }
  }
  if (ball.isWide) return `Wide! ${ball.runs > 1 ? `+${ball.runs - 1} runs` : ''}`
  if (ball.isNoBall) return `No Ball! ${ball.runs > 0 ? `${ball.runs} off the bat` : ''}`
  if (ball.isBye) return `Byes! ${ball.runs} run${ball.runs !== 1 ? 's' : ''}`
  if (ball.isLegBye) return `Leg Byes! ${ball.runs} run${ball.runs !== 1 ? 's' : ''}`
  if (ball.runs === 0) return `Dot ball. Good delivery from ${ball.bowlerName}.`
  if (ball.runs === 4) return `FOUR! ${ball.batsmanName} hits it to the boundary!`
  if (ball.runs === 6) return `SIX! ${ball.batsmanName} sends it over the ropes!`
  return `${ball.runs} run${ball.runs !== 1 ? 's' : ''} for ${ball.batsmanName}.`
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function getMatchStatusColor(status: string): string {
  switch (status) {
    case 'LIVE': return 'bg-red-500'
    case 'COMPLETED': return 'bg-gray-500'
    case 'SCHEDULED': return 'bg-blue-500'
    case 'INNINGS_BREAK': return 'bg-yellow-500'
    default: return 'bg-gray-500'
  }
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export function calcProjectedScore(
  currentRuns: number,
  currentBalls: number,
  totalBalls: number,
): number {
  if (currentBalls === 0) return 0
  return Math.round((currentRuns / currentBalls) * totalBalls)
}
