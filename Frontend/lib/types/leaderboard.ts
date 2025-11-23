/**
 * User statistics and leaderboard data types
 */

export interface UserBet {
  epoch: number
  token: string
  direction: 'bull' | 'bear'
  amount: string // ETH amount
  timestamp: number
  won: boolean | null // null if pending
  payout: string | null // null if pending or lost
}

export interface UserStats {
  address: string
  username?: string
  totalBets: number
  wins: number
  losses: number
  pending: number
  totalWagered: string // Total ETH wagered
  totalProfit: string // Net profit/loss in ETH
  winRate: number // Percentage
  currentStreak: number // Positive for wins, negative for losses
  bestStreak: number
  favoriteToken: string
  lastBetTimestamp: number
  bets: UserBet[]
  createdAt: number
  updatedAt: number
}

export interface LeaderboardEntry {
  address: string
  username?: string
  rank: number
  totalProfit: string
  winRate: number
  totalBets: number
  currentStreak: number
}

export interface LeaderboardFilters {
  timeframe: 'all' | 'week' | 'month'
  sortBy: 'profit' | 'winRate' | 'streak' | 'volume'
}

export interface LeaderboardData {
  entries: LeaderboardEntry[]
  totalUsers: number
  lastUpdated: number
}
