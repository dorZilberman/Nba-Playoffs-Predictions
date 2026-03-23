import { describe, expect, it } from "vitest"
import {
  calculateEarlyFinalsScore,
  resolveFinalsOutcomesFromSeries,
} from "./earlyFinals"

describe("resolveFinalsOutcomesFromSeries", () => {
  it("returns nulls when no completed conference or finals series", () => {
    expect(resolveFinalsOutcomesFromSeries([])).toEqual({
      eastConferenceWinner: null,
      westConferenceWinner: null,
      nbaChampion: null,
    })
  })

  it("picks east, west, and NBA champion from winning series rows", () => {
    const out = resolveFinalsOutcomesFromSeries([
      { round: "conference", conference: "east", winner: "BOS" },
      { round: "conference", conference: "west", winner: "LAL" },
      { round: "finals", conference: null, winner: "BOS" },
    ])
    expect(out).toEqual({
      eastConferenceWinner: "BOS",
      westConferenceWinner: "LAL",
      nbaChampion: "BOS",
    })
  })

  it("ignores conference rows without a winner", () => {
    const out = resolveFinalsOutcomesFromSeries([
      { round: "conference", conference: "east", winner: undefined },
      { round: "conference", conference: "east", winner: "MIA" },
    ])
    expect(out.eastConferenceWinner).toBe("MIA")
  })
})

describe("calculateEarlyFinalsScore", () => {
  const actual = {
    eastConferenceWinner: "BOS",
    westConferenceWinner: "DEN",
    nbaChampion: "BOS",
  } as const

  it("returns 0 when prediction is null", () => {
    expect(calculateEarlyFinalsScore(null, actual)).toBe(0)
  })

  it("awards 5 per correct finalist and 5 for champion", () => {
    expect(
      calculateEarlyFinalsScore(
        {
          eastFinalist: "BOS",
          westFinalist: "DEN",
          nbaChampion: "BOS",
        },
        actual
      )
    ).toBe(15)
  })

  it("awards partial points when only some picks are correct", () => {
    expect(
      calculateEarlyFinalsScore(
        {
          eastFinalist: "BOS",
          westFinalist: "LAL",
          nbaChampion: "DEN",
        },
        actual
      )
    ).toBe(5)
  })

  it("does not count finalist when actual champion path is missing", () => {
    const partial = {
      eastConferenceWinner: "BOS",
      westConferenceWinner: null as string | null,
      nbaChampion: null as string | null,
    }
    expect(
      calculateEarlyFinalsScore(
        { eastFinalist: "BOS", westFinalist: "DEN", nbaChampion: "BOS" },
        partial
      )
    ).toBe(5)
  })
})
