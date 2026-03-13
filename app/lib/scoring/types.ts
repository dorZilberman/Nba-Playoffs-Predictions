import { RoundType } from "../models/Series"

// Re-export RoundType for convenience
export type { RoundType }

export interface ScoreResult {
  points: number
  breakdown?: {
    base: number
    exact: number
    penalty: number
    bonuses: {
      sweep?: number
      sevenGame?: number
    }
  }
}

export const ROUND_BASE_VALUES: Record<RoundType, number> = {
  first: 6,
  second: 8,
  conference: 10,
  finals: 12,
}
