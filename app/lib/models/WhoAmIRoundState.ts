import mongoose, { Schema, Model, Types } from "mongoose"
import type { WhoAmIGuessRowPayload } from "@/app/lib/minigames/whoAmIFeedback"

export type WhoAmIPersistedStatus = "playing" | "won" | "lost"

export interface IWhoAmIRoundState {
  userId: Types.ObjectId
  inLobby: boolean
  secretPlayerId: string | null
  photoHintUsed: boolean
  guessRows: WhoAmIGuessRowPayload[]
  status: WhoAmIPersistedStatus
  updatedAt: Date
}

const WhoAmIRoundStateSchema = new Schema<IWhoAmIRoundState>(
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
    secretPlayerId: {
      type: String,
      default: null,
    },
    photoHintUsed: {
      type: Boolean,
      required: true,
      default: false,
    },
    /** Array of serialized guess rows (nested feedback objects). */
    guessRows: {
      type: [{ type: Schema.Types.Mixed }],
      default: () => [],
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

if (process.env.NODE_ENV !== "production") {
  try {
    mongoose.deleteModel("WhoAmIRoundState")
  } catch {
    /* model not registered yet */
  }
}

const WhoAmIRoundState: Model<IWhoAmIRoundState> =
  mongoose.models.WhoAmIRoundState ||
  mongoose.model<IWhoAmIRoundState>(
    "WhoAmIRoundState",
    WhoAmIRoundStateSchema
  )

export default WhoAmIRoundState
