import { describe, expect, it } from "vitest"
import { filterPredictionsByPaid, predictionUserId } from "./predictionUserFilter"

describe("predictionUserId", () => {
  it("returns empty string for null or undefined userId", () => {
    expect(predictionUserId({ userId: null })).toBe("")
    expect(predictionUserId({ userId: undefined })).toBe("")
  })

  it("stringifies raw id values", () => {
    expect(predictionUserId({ userId: "507f1f77bcf86cd799439011" })).toBe(
      "507f1f77bcf86cd799439011"
    )
  })

  it("reads _id from populated user shape", () => {
    const populated = {
      _id: "507f1f77bcf86cd799439011",
      name: "Ada",
    }
    expect(predictionUserId({ userId: populated })).toBe("507f1f77bcf86cd799439011")
  })

  it("stringifies ObjectId-like _id via toString", () => {
    const oidLike = { toString: () => "507f1f77bcf86cd799439011" }
    expect(predictionUserId({ userId: { _id: oidLike } })).toBe(
      "507f1f77bcf86cd799439011"
    )
  })
})

describe("filterPredictionsByPaid", () => {
  const a = { userId: "user-a" }
  const b = { userId: "user-b" }

  it("returns all predictions when paidIds is null", () => {
    expect(filterPredictionsByPaid([a, b], null)).toEqual([a, b])
  })

  it("keeps only predictions whose user id is in the set", () => {
    const paid = new Set(["user-a"])
    expect(filterPredictionsByPaid([a, b], paid)).toEqual([a])
  })

  it("returns empty when no ids match", () => {
    expect(filterPredictionsByPaid([a, b], new Set(["other"]))).toEqual([])
  })
})
