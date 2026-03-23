import { describe, expect, it } from "vitest"
import type { IPrediction } from "@/app/lib/models/Prediction"
import type { ISeries } from "@/app/lib/models/Series"
import type { IPlayInGame } from "@/app/lib/models/PlayInGame"
import { calculatePlayInScore, calculateSeriesScore } from "./calculator"

const T1 = "TEAM_A"
const T2 = "TEAM_B"

function series(partial: Partial<ISeries> = {}): ISeries {
  return {
    _id: "s1",
    seasonId: "507f1f77bcf86cd799439011" as unknown as ISeries["seasonId"],
    round: "first",
    conference: "east",
    team1: T1,
    team2: T2,
    startTime: new Date(),
    currentScore: { team1Wins: 4, team2Wins: 0 },
    createdAt: new Date(),
    updatedAt: new Date(),
    winner: T1,
    ...partial,
  }
}

function pred(partial: Partial<IPrediction>): IPrediction {
  return {
    _id: "p1",
    userId: "507f1f77bcf86cd799439012" as unknown as IPrediction["userId"],
    predictedWinner: T1,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  } as IPrediction
}

describe("calculatePlayInScore", () => {
  it("returns 0 when the game has no winner yet", () => {
    const game = {
      winner: undefined,
    } as Pick<IPlayInGame, "winner">
    expect(calculatePlayInScore(pred({}), game as IPlayInGame)).toBe(0)
  })

  it("returns 2 when predicted winner matches actual winner", () => {
    const game = { winner: T1 } as Pick<IPlayInGame, "winner">
    expect(
      calculatePlayInScore(pred({ predictedWinner: T1 }), game as IPlayInGame)
    ).toBe(2)
  })

  it("returns 0 when predicted winner is wrong", () => {
    const game = { winner: T1 } as Pick<IPlayInGame, "winner">
    expect(
      calculatePlayInScore(pred({ predictedWinner: T2 }), game as IPlayInGame)
    ).toBe(0)
  })
})

describe("calculateSeriesScore", () => {
  it("returns 0 when series has no winner", () => {
    const s = series({
      winner: undefined,
      currentScore: { team1Wins: 2, team2Wins: 2 },
    })
    expect(calculateSeriesScore(pred({ predictedScore: { team1Wins: 4, team2Wins: 0 } }), s, "first")).toEqual({
      points: 0,
    })
  })

  it("returns 0 when prediction has no score", () => {
    const s = series({ winner: T1, currentScore: { team1Wins: 4, team2Wins: 0 } })
    expect(
      calculateSeriesScore(pred({ predictedWinner: T1, predictedScore: undefined }), s, "first")
    ).toEqual({ points: 0 })
  })

  it("awards base + 4 for exact score match (first round base 6)", () => {
    const s = series({
      winner: T1,
      currentScore: { team1Wins: 4, team2Wins: 2 },
    })
    const r = calculateSeriesScore(
      pred({
        predictedWinner: T1,
        predictedScore: { team1Wins: 4, team2Wins: 2 },
      }),
      s,
      "first"
    )
    expect(r.points).toBe(10)
    expect(r.breakdown?.exact).toBe(4)
    expect(r.breakdown?.base).toBe(6)
  })

  it("uses penalty y = |predicted loser wins - actual loser wins| when winner is correct", () => {
    // Both T1 wins; predicted 4-1 (loser T2 has 1), actual 4-3 (loser has 3) → y=2, first round 6-2=4
    const s = series({
      winner: T1,
      currentScore: { team1Wins: 4, team2Wins: 3 },
    })
    const r = calculateSeriesScore(
      pred({
        predictedWinner: T1,
        predictedScore: { team1Wins: 4, team2Wins: 1 },
      }),
      s,
      "first"
    )
    expect(r.points).toBe(4)
    expect(r.breakdown?.penalty).toBe(2)
  })

  it("uses finals base value 12 for exact match", () => {
    const s = series({
      round: "finals",
      conference: null,
      winner: T2,
      currentScore: { team1Wins: 2, team2Wins: 4 },
    })
    const r = calculateSeriesScore(
      pred({
        predictedWinner: T2,
        predictedScore: { team1Wins: 2, team2Wins: 4 },
      }),
      s,
      "finals"
    )
    expect(r.points).toBe(16)
    expect(r.breakdown?.base).toBe(12)
  })

  it("returns 0 points for wrong winner when not a qualifying seven-game bonus", () => {
    const s = series({
      winner: T1,
      currentScore: { team1Wins: 4, team2Wins: 1 },
    })
    const r = calculateSeriesScore(
      pred({
        predictedWinner: T2,
        predictedScore: { team1Wins: 1, team2Wins: 4 },
      }),
      s,
      "first"
    )
    expect(r.points).toBe(0)
  })

  it("adds seven-game bonus (+2) when wrong winner but both sides predicted and actual are 4-3 series", () => {
    const s = series({
      winner: T1,
      currentScore: { team1Wins: 4, team2Wins: 3 },
    })
    const r = calculateSeriesScore(
      pred({
        predictedWinner: T2,
        predictedScore: { team1Wins: 3, team2Wins: 4 },
      }),
      s,
      "first"
    )
    expect(r.points).toBe(2)
    expect(r.breakdown?.bonuses.sevenGame).toBe(2)
  })

  it("adds sweep bonus (+2) when predicted and actual are both 4-0 for team1", () => {
    const s = series({
      winner: T1,
      currentScore: { team1Wins: 4, team2Wins: 0 },
    })
    const r = calculateSeriesScore(
      pred({
        predictedWinner: T1,
        predictedScore: { team1Wins: 4, team2Wins: 0 },
      }),
      s,
      "first"
    )
    // exact match: 6+4 + sweep 2
    expect(r.points).toBe(12)
    expect(r.breakdown?.bonuses.sweep).toBe(2)
  })

  it("adds sweep bonus for 0-4 / 0-4 team2 sweep mirror case", () => {
    const s = series({
      winner: T2,
      currentScore: { team1Wins: 0, team2Wins: 4 },
    })
    const r = calculateSeriesScore(
      pred({
        predictedWinner: T2,
        predictedScore: { team1Wins: 0, team2Wins: 4 },
      }),
      s,
      "second"
    )
    expect(r.breakdown?.bonuses.sweep).toBe(2)
    expect(r.points).toBe(8 + 4 + 2)
  })

})
