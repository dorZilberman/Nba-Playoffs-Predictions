import { describe, expect, it } from "vitest"
import {
  buildMostPointsHypoScores,
  type MostPointsEarlyFinalsInput,
  type MostPointsPredictionInput,
  type MostPointsSeriesInput,
} from "./mostPointsScenario"

const SEASON = "season1"
const USER = "u1"

function makeSeries(
  overrides: Partial<MostPointsSeriesInput> &
    Pick<MostPointsSeriesInput, "_id" | "round" | "conference" | "team1" | "team2">
): MostPointsSeriesInput {
  return {
    seasonId: SEASON,
    startTime: "2026-05-01T00:00:00.000Z",
    ...overrides,
  }
}

function makePred(
  overrides: Partial<MostPointsPredictionInput> &
    Pick<MostPointsPredictionInput, "predictedWinner">
): MostPointsPredictionInput {
  return {
    userId: USER,
    ...overrides,
  }
}

describe("buildMostPointsHypoScores — Early Finals integration", () => {
  it("with no Early Finals input, falls back to legacy shortest-feasible when user has no per-series prediction", () => {
    const series = [
      makeSeries({
        _id: "s-west-cf",
        round: "conference",
        conference: "west",
        team1: "LAL",
        team2: "DEN",
        currentScore: { team1Wins: 3, team2Wins: 3 },
      }),
    ]
    const out = buildMostPointsHypoScores({
      series,
      predictions: [],
      userId: USER,
      eligibleSeriesIds: new Set(["s-west-cf"]),
    })
    // Shortest-feasible from 3-3 is either 4-3 or 3-4 (both 7 games).
    // Legacy implementation picks the first in VALID_FINALS order: (4,3).
    expect(out["s-west-cf"]).toEqual({ team1Wins: 4, team2Wins: 3 })
  })

  it("flips the conference final winner toward the user's Early Finals pick when no per-series prediction exists", () => {
    const series = [
      makeSeries({
        _id: "s-west-cf",
        round: "conference",
        conference: "west",
        team1: "LAL",
        team2: "DEN",
        currentScore: { team1Wins: 3, team2Wins: 3 },
      }),
    ]
    const earlyFinals: MostPointsEarlyFinalsInput = {
      eastFinalist: "BOS",
      westFinalist: "DEN",
      nbaChampion: "DEN",
    }
    const out = buildMostPointsHypoScores({
      series,
      predictions: [],
      userId: USER,
      eligibleSeriesIds: new Set(["s-west-cf"]),
      earlyFinals,
    })
    expect(out["s-west-cf"]).toEqual({ team1Wins: 3, team2Wins: 4 })
  })

  it("flips the Finals winner toward the user's NBA champion pick when no per-series prediction exists", () => {
    const series = [
      makeSeries({
        _id: "s-finals",
        round: "finals",
        conference: null,
        team1: "BOS",
        team2: "DEN",
        currentScore: { team1Wins: 0, team2Wins: 0 },
      }),
    ]
    const earlyFinals: MostPointsEarlyFinalsInput = {
      eastFinalist: "BOS",
      westFinalist: "DEN",
      nbaChampion: "DEN",
    }
    const out = buildMostPointsHypoScores({
      series,
      predictions: [],
      userId: USER,
      eligibleSeriesIds: new Set(["s-finals"]),
      earlyFinals,
    })
    // Both 4-0 and 0-4 are 4-game endings; Early Finals prefers DEN champion.
    expect(out["s-finals"]).toEqual({ team1Wins: 0, team2Wins: 4 })
  })

  it("does NOT apply the Early Finals bonus for first-round series", () => {
    const series = [
      makeSeries({
        _id: "s-east-r1",
        round: "first",
        conference: "east",
        team1: "BOS",
        team2: "MIA",
        currentScore: { team1Wins: 0, team2Wins: 0 },
      }),
    ]
    const earlyFinals: MostPointsEarlyFinalsInput = {
      eastFinalist: "MIA",
      westFinalist: "DEN",
      nbaChampion: "DEN",
    }
    const out = buildMostPointsHypoScores({
      series,
      predictions: [],
      userId: USER,
      eligibleSeriesIds: new Set(["s-east-r1"]),
      earlyFinals,
    })
    // Without EF bias, shortest feasible from 0-0 → (4,0): BOS wins.
    expect(out["s-east-r1"]).toEqual({ team1Wins: 4, team2Wins: 0 })
  })

  it("does NOT apply the Early Finals bonus for second-round series", () => {
    const series = [
      makeSeries({
        _id: "s-east-r2",
        round: "second",
        conference: "east",
        team1: "BOS",
        team2: "NYK",
        currentScore: { team1Wins: 0, team2Wins: 0 },
      }),
    ]
    const earlyFinals: MostPointsEarlyFinalsInput = {
      eastFinalist: "NYK",
      westFinalist: "DEN",
      nbaChampion: "NYK",
    }
    const out = buildMostPointsHypoScores({
      series,
      predictions: [],
      userId: USER,
      eligibleSeriesIds: new Set(["s-east-r2"]),
      earlyFinals,
    })
    expect(out["s-east-r2"]).toEqual({ team1Wins: 4, team2Wins: 0 })
  })

  it("when the user has predictedWinner but no predictedScore, picks the EF-friendly winner", () => {
    const series = [
      makeSeries({
        _id: "s-east-cf",
        round: "conference",
        conference: "east",
        team1: "BOS",
        team2: "MIA",
        currentScore: { team1Wins: 0, team2Wins: 0 },
      }),
    ]
    const predictions: MostPointsPredictionInput[] = [
      makePred({ seriesId: "s-east-cf", predictedWinner: "BOS" }),
    ]
    const earlyFinals: MostPointsEarlyFinalsInput = {
      eastFinalist: "MIA",
      westFinalist: "DEN",
      nbaChampion: "MIA",
    }
    const out = buildMostPointsHypoScores({
      series,
      predictions,
      userId: USER,
      eligibleSeriesIds: new Set(["s-east-cf"]),
      earlyFinals,
    })
    // EF says MIA wins → optimizer favors MIA over BOS. Shortest game count: 0-4.
    expect(out["s-east-cf"]).toEqual({ team1Wins: 0, team2Wins: 4 })
  })

  it("folds Early Finals bonus into series prediction scoring (exact match still optimal when bonus alone can't beat it)", () => {
    const series = [
      makeSeries({
        _id: "s-west-cf",
        round: "conference",
        conference: "west",
        team1: "LAL",
        team2: "DEN",
        currentScore: { team1Wins: 3, team2Wins: 2 },
      }),
    ]
    const predictions: MostPointsPredictionInput[] = [
      makePred({
        seriesId: "s-west-cf",
        predictedWinner: "LAL",
        predictedScore: { team1Wins: 4, team2Wins: 2 },
      }),
    ]
    // EF favors DEN, but the LAL 4-2 exact match (10 + 4 = 14) beats any DEN ending (5 EF).
    const earlyFinals: MostPointsEarlyFinalsInput = {
      eastFinalist: "BOS",
      westFinalist: "DEN",
      nbaChampion: "DEN",
    }
    const out = buildMostPointsHypoScores({
      series,
      predictions,
      userId: USER,
      eligibleSeriesIds: new Set(["s-west-cf"]),
      earlyFinals,
    })
    expect(out["s-west-cf"]).toEqual({ team1Wins: 4, team2Wins: 2 })
  })

  it("ignores Early Finals input for series outside the eligible set or already won", () => {
    const series = [
      makeSeries({
        _id: "s-finals",
        round: "finals",
        conference: null,
        team1: "BOS",
        team2: "DEN",
        currentScore: { team1Wins: 0, team2Wins: 0 },
        // Not in eligibleSeriesIds below → must be skipped.
      }),
      makeSeries({
        _id: "s-east-cf-done",
        round: "conference",
        conference: "east",
        team1: "BOS",
        team2: "MIA",
        currentScore: { team1Wins: 4, team2Wins: 1 },
        winner: "BOS",
      }),
    ]
    const earlyFinals: MostPointsEarlyFinalsInput = {
      eastFinalist: "BOS",
      westFinalist: "DEN",
      nbaChampion: "DEN",
    }
    const out = buildMostPointsHypoScores({
      series,
      predictions: [],
      userId: USER,
      eligibleSeriesIds: new Set(["s-east-cf-done"]),
      earlyFinals,
    })
    expect(out).toEqual({})
  })
})
