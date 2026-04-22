import mongoose, { Schema, Model, Types } from "mongoose"

export interface IWhoHePlayForStats {
  userId: Types.ObjectId
  currentStreak: number
  bestStreak: number
  pendingPlayerId: string | null
  /** True until the user presses Start / after loss or give up (lobby screen). */
  inLobby: boolean
  /** After a correct guess until Next player advances. */
  pendingResolved: boolean
  /** Wall-clock end of the current guess window (playing only). */
  roundDeadlineAt: Date | null
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
    inLobby: {
      type: Boolean,
      required: true,
      default: true,
    },
    pendingResolved: {
      type: Boolean,
      required: true,
      default: false,
    },
    roundDeadlineAt: {
      type: Date,
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
