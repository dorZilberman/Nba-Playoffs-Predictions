import mongoose, { Schema, Model, Types } from "mongoose"

export interface IWhoAmIStreakStats {
  userId: Types.ObjectId
  currentStreak: number
  bestStreak: number
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
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
)

WhoAmIStreakStatsSchema.index({ bestStreak: -1 })

const WhoAmIStreakStats: Model<IWhoAmIStreakStats> =
  mongoose.models.WhoAmIStreakStats ||
  mongoose.model<IWhoAmIStreakStats>(
    "WhoAmIStreakStats",
    WhoAmIStreakStatsSchema
  )

export default WhoAmIStreakStats
