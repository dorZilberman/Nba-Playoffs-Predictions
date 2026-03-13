import mongoose, { Schema, Model } from "mongoose"

export type RoundType = "first" | "second" | "conference" | "finals"
export type ConferenceType = "east" | "west" | null

export interface ISeries {
  _id: string
  seasonId: mongoose.Types.ObjectId
  round: RoundType
  conference: ConferenceType
  team1: string
  team2: string
  team1Seed?: number
  team2Seed?: number
  startTime: Date
  currentScore: {
    team1Wins: number
    team2Wins: number
  }
  winner?: string
  createdAt: Date
  updatedAt: Date
}

const SeriesSchema = new Schema<ISeries>(
  {
    seasonId: {
      type: Schema.Types.ObjectId,
      ref: "Season",
      required: true,
    },
    round: {
      type: String,
      enum: ["first", "second", "conference", "finals"],
      required: true,
    },
    conference: {
      type: String,
      enum: ["east", "west", null],
      default: null,
    },
    team1: {
      type: String,
      required: true,
    },
    team2: {
      type: String,
      required: true,
    },
    team1Seed: {
      type: Number,
      min: 1,
      max: 8,
    },
    team2Seed: {
      type: Number,
      min: 1,
      max: 8,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    currentScore: {
      team1Wins: {
        type: Number,
        default: 0,
        min: 0,
        max: 4,
      },
      team2Wins: {
        type: Number,
        default: 0,
        min: 0,
        max: 4,
      },
    },
    winner: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false,
  }
)

SeriesSchema.pre("save", function (next) {
  this.updatedAt = new Date()
  next()
})

const Series: Model<ISeries> =
  mongoose.models.Series || mongoose.model<ISeries>("Series", SeriesSchema)

export default Series
