import mongoose, { Schema, Model } from "mongoose"

export interface IEarlyFinalsPrediction {
  _id: string
  userId: mongoose.Types.ObjectId
  seasonId: mongoose.Types.ObjectId
  /** Team name (must match Team.name) — predicted East conference finals winner */
  eastFinalist: string
  /** Team name — predicted West conference finals winner */
  westFinalist: string
  /** Must equal eastFinalist or westFinalist — predicted NBA champion */
  nbaChampion: string
  createdAt: Date
  updatedAt: Date
}

const EarlyFinalsPredictionSchema = new Schema<IEarlyFinalsPrediction>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    seasonId: {
      type: Schema.Types.ObjectId,
      ref: "Season",
      required: true,
      index: true,
    },
    eastFinalist: { type: String, required: true },
    westFinalist: { type: String, required: true },
    nbaChampion: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
)

EarlyFinalsPredictionSchema.pre("save", function (next) {
  this.updatedAt = new Date()
  next()
})

EarlyFinalsPredictionSchema.index(
  { userId: 1, seasonId: 1 },
  { unique: true }
)

const EarlyFinalsPrediction: Model<IEarlyFinalsPrediction> =
  mongoose.models.EarlyFinalsPrediction ||
  mongoose.model<IEarlyFinalsPrediction>(
    "EarlyFinalsPrediction",
    EarlyFinalsPredictionSchema
  )

export default EarlyFinalsPrediction
