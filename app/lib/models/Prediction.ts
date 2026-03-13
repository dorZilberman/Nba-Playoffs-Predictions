import mongoose, { Schema, Model } from "mongoose"

export interface IPrediction {
  _id: string
  userId: mongoose.Types.ObjectId
  seriesId?: mongoose.Types.ObjectId
  playInGameId?: mongoose.Types.ObjectId
  predictedWinner: string
  predictedScore?: {
    team1Wins: number
    team2Wins: number
  }
  lockedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const PredictionSchema = new Schema<IPrediction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    seriesId: {
      type: Schema.Types.ObjectId,
      ref: "Series",
      index: true,
    },
    playInGameId: {
      type: Schema.Types.ObjectId,
      ref: "PlayInGame",
      index: true,
    },
    predictedWinner: {
      type: String,
      required: true,
    },
    predictedScore: {
      team1Wins: {
        type: Number,
        min: 0,
        max: 4,
      },
      team2Wins: {
        type: Number,
        min: 0,
        max: 4,
      },
    },
    lockedAt: {
      type: Date,
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

PredictionSchema.pre("save", function (next) {
  this.updatedAt = new Date()
  next()
})

// Compound indexes for uniqueness
// Use partial indexes to exclude null/undefined values
PredictionSchema.index(
  { userId: 1, seriesId: 1 },
  { unique: true, partialFilterExpression: { seriesId: { $exists: true, $type: 'objectId' } } }
)
PredictionSchema.index(
  { userId: 1, playInGameId: 1 },
  { unique: true, partialFilterExpression: { playInGameId: { $exists: true, $type: 'objectId' } } }
)

const Prediction: Model<IPrediction> =
  mongoose.models.Prediction ||
  mongoose.model<IPrediction>("Prediction", PredictionSchema)

export default Prediction
