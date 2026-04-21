import mongoose, { Schema, Model, Types } from "mongoose"

export interface IWhoHePlayForStats {
  userId: Types.ObjectId
  /** Consecutive correct answers (resets on a miss). */
  currentStreak: number
  /** Highest streak ever for this user. */
  bestStreak: number
  /** Active round: player id from roster JSON until answered. */
  pendingPlayerId: string | null
  updatedAt: Date
}

const WhoHePlayForStatsSchema = new Schema<IWhoHePlayForStats>(
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
    pendingPlayerId: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
)

WhoHePlayForStatsSchema.index({ bestStreak: -1, currentStreak: -1 })

const WhoHePlayForStats: Model<IWhoHePlayForStats> =
  mongoose.models.WhoHePlayForStats ||
  mongoose.model<IWhoHePlayForStats>(
    "WhoHePlayForStats",
    WhoHePlayForStatsSchema
  )

export default WhoHePlayForStats
