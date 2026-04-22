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
      max: 3,
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

const HangmanRoundState: Model<IHangmanRoundState> =
  mongoose.models.HangmanRoundState ||
  mongoose.model<IHangmanRoundState>(
    "HangmanRoundState",
    HangmanRoundStateSchema
  )

export default HangmanRoundState
