import mongoose, { Schema, Model, Types } from "mongoose"

export interface IHangmanStreakStats {
  userId: Types.ObjectId
  currentStreak: number
  bestStreak: number
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
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
)

HangmanStreakStatsSchema.index({ bestStreak: -1 })

const HangmanStreakStats: Model<IHangmanStreakStats> =
  mongoose.models.HangmanStreakStats ||
  mongoose.model<IHangmanStreakStats>(
    "HangmanStreakStats",
    HangmanStreakStatsSchema
  )

export default HangmanStreakStats
