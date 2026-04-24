import mongoose, { Schema, Model, Types } from "mongoose"

export interface IHangmanStreakStats {
  userId: Types.ObjectId
  currentStreak: number
  bestStreak: number
  /** Hints this run: Start New Game → next loss or give up (cumulative across rounds in that stretch). */
  runHintsUsed: number
  /** Min run hints at a moment the player reached (or re-matched) their bestStreak. Leaderboard tie-break; lower is better. */
  minHintsForBestTie?: number | null
  updatedAt: Date
}

const HangmanStreakStatsSchema = new Schema<IHangmanStreakStats>(
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

HangmanStreakStatsSchema.index({ bestStreak: -1, minHintsForBestTie: 1, updatedAt: -1 })

if (process.env.NODE_ENV !== "production") {
  try {
    mongoose.deleteModel("HangmanStreakStats")
  } catch {
    /* model not registered yet */
  }
}

const HangmanStreakStats: Model<IHangmanStreakStats> =
  mongoose.models.HangmanStreakStats ||
  mongoose.model<IHangmanStreakStats>(
    "HangmanStreakStats",
    HangmanStreakStatsSchema
  )

export default HangmanStreakStats
