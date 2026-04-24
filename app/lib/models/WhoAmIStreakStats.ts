import mongoose, { Schema, Model, Types } from "mongoose"

export interface IWhoAmIStreakStats {
  userId: Types.ObjectId
  currentStreak: number
  bestStreak: number
  /** Photo hints this run (from Start new round after loss through losses). */
  runHintsUsed: number
  minHintsForBestTie?: number | null | undefined
  updatedAt: Date
}

const WhoAmIStreakStatsSchema = new Schema<IWhoAmIStreakStats>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    currentStreak: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    bestStreak: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    runHintsUsed: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    minHintsForBestTie: {
      type: Number,
      min: 0,
      required: false,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
)

WhoAmIStreakStatsSchema.index({ bestStreak: -1, minHintsForBestTie: 1, updatedAt: -1 })

if (process.env.NODE_ENV !== "production") {
  try {
    mongoose.deleteModel("WhoAmIStreakStats")
  } catch {
    /* model not registered yet */
  }
}

const WhoAmIStreakStats: Model<IWhoAmIStreakStats> =
  mongoose.models.WhoAmIStreakStats ||
  mongoose.model<IWhoAmIStreakStats>(
    "WhoAmIStreakStats",
    WhoAmIStreakStatsSchema
  )

export default WhoAmIStreakStats
