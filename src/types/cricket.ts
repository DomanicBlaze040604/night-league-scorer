// ─── Core Types ────────────────────────────────────────────────────────────

export type TournamentFormat = 'ROUND_ROBIN' | 'KNOCKOUT' | 'ROUND_ROBIN_KNOCKOUT'
export type TournamentStatus = 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
export type MatchStatus = 'SCHEDULED' | 'TOSS' | 'LIVE' | 'INNINGS_BREAK' | 'COMPLETED' | 'ABANDONED' | 'NO_RESULT'
export type InningsStatus = 'NOT_STARTED' | 'LIVE' | 'COMPLETED'
export type WicketType = 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED' | 'HIT_WICKET' | 'RETIRED_OUT' | 'RETIRED_HURT'
export type ExtraType = 'WIDE' | 'NO_BALL' | 'BYE' | 'LEG_BYE'
export type UserRole = 'ADMIN' | 'SCORER' | 'CAPTAIN' | 'VIEWER'

export interface Tournament {
  id: string
  name: string
  slug: string
  description?: string
  format: TournamentFormat
  status: TournamentStatus
  startDate: string
  endDate?: string
  overs: number
  location?: string
  logoUrl?: string
  createdAt: string
  updatedAt: string
  tournamentTeams?: TournamentTeam[]
  matches?: Match[]
  pointsTable?: PointsTableEntry[]
}

export interface Team {
  id: string
  name: string
  shortName: string
  logoUrl?: string
  primaryColor: string
  createdAt: string
  players?: Player[]
}

export interface TournamentTeam {
  id: string
  tournamentId: string
  teamId: string
  captainId?: string
  team: Team
}

export interface Player {
  id: string
  teamId: string
  name: string
  jerseyNo?: number
  photoUrl?: string
  role?: string
  battingStyle?: string
  bowlingStyle?: string
  isActive: boolean
  team?: Team
}

export interface Match {
  id: string
  tournamentId: string
  matchNumber: number
  homeTeamId: string
  awayTeamId: string
  venue?: string
  scheduledAt: string
  overs: number
  status: MatchStatus
  tossWinnerId?: string
  tossChoice?: string
  winnerTeamId?: string
  resultText?: string
  winMargin?: number
  winType?: string
  isFinal: boolean
  homeTeam: Team
  awayTeam: Team
  winnerTeam?: Team
  innings?: Innings[]
  tournament?: Tournament
}

export interface Innings {
  id: string
  matchId: string
  battingTeamId: string
  inningsNo: number
  status: InningsStatus
  totalRuns: number
  totalWickets: number
  totalOvers: number
  totalBalls: number
  extras: number
  wides: number
  noBalls: number
  byes: number
  legByes: number
  targetRuns?: number
  battingTeam?: Team
  overs?: Over[]
  balls?: Ball[]
  battingInnings?: BattingInnings[]
  bowlingSpells?: BowlingSpell[]
  partnerships?: Partnership[]
  fallOfWickets?: FallOfWicket[]
}

export interface Over {
  id: string
  inningsId: string
  overNo: number
  bowlerId?: string
  runs: number
  wickets: number
  wides: number
  noBalls: number
  isMaiden: boolean
  balls?: Ball[]
}

export interface Ball {
  id: string
  inningsId: string
  overId: string
  overNo: number
  ballNo: number
  totalBallNo: number
  batsmanId: string
  bowlerId: string
  fielder1Id?: string
  runs: number
  extras: number
  extraType?: ExtraType
  isWicket: boolean
  wicketType?: WicketType
  dismissedBatsmanId?: string
  isBoundary: boolean
  isSix: boolean
  isLegalDelivery: boolean
  isFreeHit: boolean
  commentary?: string
  createdAt: string
  batsman?: Player
  bowler?: Player
  fielder?: Player
}

export interface BattingInnings {
  id: string
  inningsId: string
  playerId: string
  runs: number
  balls: number
  fours: number
  sixes: number
  strikeRate: number
  isOut: boolean
  wicketType?: WicketType
  bowlerId?: string
  fielderId?: string
  battingOrder: number
  player?: Player
}

export interface BowlingSpell {
  id: string
  inningsId: string
  playerId: string
  overs: number
  maidens: number
  runs: number
  wickets: number
  wides: number
  noBalls: number
  economy: number
  player?: Player
}

export interface Partnership {
  id: string
  inningsId: string
  batsman1Id: string
  batsman2Id: string
  runs: number
  balls: number
  wicketNo: number
  batsman1?: Player
  batsman2?: Player
}

export interface FallOfWicket {
  id: string
  inningsId: string
  wicketNo: number
  playerId: string
  runs: number
  overNo: number
  wicketType: WicketType
}

export interface PointsTableEntry {
  id: string
  tournamentId: string
  teamId: string
  played: number
  won: number
  lost: number
  tied: number
  noResult: number
  points: number
  runsFor: number
  oversFor: number
  runsAgainst: number
  oversAgainst: number
  nrr: number
  team?: Team
}

export interface Award {
  id: string
  tournamentId: string
  type: string
  playerId: string
  teamId: string
  value: number
  description?: string
  player?: Player
  team?: Team
}

// ─── Scoring State Types ───────────────────────────────────────────────────

export interface ScoringState {
  matchId: string
  currentInnings: number
  innings1?: LiveInningsState
  innings2?: LiveInningsState
  matchStatus: MatchStatus
  tossWinnerId?: string
  tossChoice?: string
}

export interface LiveInningsState {
  inningsId: string
  battingTeamId: string
  totalRuns: number
  totalWickets: number
  totalOvers: number
  totalBalls: number
  extras: number
  striker: BattingInnings | null
  nonStriker: BattingInnings | null
  currentBowler: BowlingSpell | null
  currentOverBalls: Ball[]
  targetRuns?: number
  requiredRuns?: number
  requiredBalls?: number
  currentRunRate: number
  requiredRunRate?: number
  projectedScore?: number
  isFreeHit: boolean
}

// ─── Ball Input Type ───────────────────────────────────────────────────────

export interface BallInput {
  runs: number
  isWide?: boolean
  isNoBall?: boolean
  isBye?: boolean
  isLegBye?: boolean
  isWicket?: boolean
  wicketType?: WicketType
  dismissedBatsmanId?: string
  fielder1Id?: string
  newBatsmanId?: string
}

// ─── Commentary Types ──────────────────────────────────────────────────────

export interface Commentary {
  id: string
  matchId: string
  overNo: number
  ballNo: number
  text: string
  type: 'BALL' | 'WICKET' | 'BOUNDARY' | 'OVER' | 'MILESTONE' | 'INFO'
  createdAt: string
}

// ─── Stats Display Types ───────────────────────────────────────────────────

export interface PlayerTournamentStats {
  player: Player
  batting: BattingStats
  bowling: BowlingStats
  fielding: FieldingStats
}

export interface BattingStats {
  matches: number
  innings: number
  notOuts: number
  runs: number
  balls: number
  highScore: number
  average: number
  strikeRate: number
  fifties: number
  hundreds: number
  fours: number
  sixes: number
  ducks: number
}

export interface BowlingStats {
  matches: number
  innings: number
  overs: number
  maidens: number
  runs: number
  wickets: number
  bestFiguresW: number
  bestFiguresR: number
  average: number
  economy: number
}

export interface FieldingStats {
  catches: number
  runOuts: number
  stumpings: number
}
