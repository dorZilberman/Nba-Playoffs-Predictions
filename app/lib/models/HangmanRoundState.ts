import mongoose, { Schema, Model, Types } from "mongoose"

export type HangmanPersistedStatus = "playing" | "won" | "lost"

export interface IHangmanRoundState {
  userId: Types.ObjectId
  /** No active puzzle until user starts (or after loss / give up). */
  inLobby: boolean
  /** Current roster player id when not in lobby. */
  playerId: string | null
  guessedLetters: string[]
  wrong: number
  hintsUsed: number
  status: HangmanPersistedStatus
  updatedAt: Date
}

const HangmanRoundStateSchema = new Schema<IHangmanRoundState>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    inLobby: {
      type: Boolean,
      required: true,
      default: true,
    },
    playerId: {
      type: String,
      default: null,
    },
    guessedLetters: {
      type: [String],
      default: [],
    },
    wrong: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    hintsUsed: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
      max: 4,
    },
    status: {
      type: String,
      enum: ["playing", "won", "lost"],
      required: true,
      default: "playing",
    },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
)

/**
 * Next.js dev HMR re-imports this module but Mongoose keeps the old compiled
 * model (e.g. hintsUsed max still 3 after we bump to 4). Drop stale model in
 * development so schema changes apply without a full server restart.
 */
if (process.env.NODE_ENV !== "production") {
  try {
    mongoose.deleteModel("HangmanRoundState")
  } catch {
    /* model not registered yet */
  }
}

const HangmanRoundState: Model<IHangmanRoundState> =
  mongoose.models.HangmanRoundState ||
  mongoose.model<IHangmanRoundState>(
    "HangmanRoundState",
    HangmanRoundStateSchema
  )

export default HangmanRoundState
