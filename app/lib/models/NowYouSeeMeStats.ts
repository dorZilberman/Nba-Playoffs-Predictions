import mongoose, { Schema, Model, Types } from "mongoose"

export interface INowYouSeeMeStats {
  userId: Types.ObjectId
  currentStreak: number
  bestStreak: number
  pendingPlayerId: string | null
  /** True until the user presses Start / after loss or give up (lobby screen). */
  inLobby: boolean
  /** Wall-clock end of the current guess window (playing only). */
  roundDeadlineAt: Date | null
  updatedAt: Date
}

const NowYouSeeMeStatsSchema = new Schema<INowYouSeeMeStats>(
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
    roundDeadlineAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
)

NowYouSeeMeStatsSchema.index({ bestStreak: -1, currentStreak: -1 })

const NowYouSeeMeStats: Model<INowYouSeeMeStats> =
  mongoose.models.NowYouSeeMeStats ||
  mongoose.model<INowYouSeeMeStats>(
    "NowYouSeeMeStats",
    NowYouSeeMeStatsSchema
  )

export default NowYouSeeMeStats
