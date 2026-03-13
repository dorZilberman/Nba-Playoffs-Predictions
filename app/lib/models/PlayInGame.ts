import mongoose, { Schema, Model } from "mongoose"

export type PlayInGameType =
  | "east-7-8"
  | "east-9-10"
  | "west-7-8"
  | "west-9-10"
  | "east-final"
  | "west-final"

export interface IPlayInGame {
  _id: string
  seasonId: mongoose.Types.ObjectId
  gameType: PlayInGameType
  team1: string
  team2: string
  startTime: Date
  winner?: string
  createdAt: Date
}

const PlayInGameSchema = new Schema<IPlayInGame>(
  {
    seasonId: {
      type: Schema.Types.ObjectId,
      ref: "Season",
      required: true,
    },
    gameType: {
      type: String,
      enum: [
        "east-7-8",
        "east-9-10",
        "west-7-8",
        "west-9-10",
        "east-final",
        "west-final",
      ],
      required: true,
    },
    team1: {
      type: String,
      required: true,
    },
    team2: {
      type: String,
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    winner: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
)

const PlayInGame: Model<IPlayInGame> =
  mongoose.models.PlayInGame ||
  mongoose.model<IPlayInGame>("PlayInGame", PlayInGameSchema)

export default PlayInGame
