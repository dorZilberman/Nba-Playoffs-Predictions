import mongoose, { Schema, Model } from "mongoose"

export interface ISeason {
  _id: string
  year: number
  isActive: boolean
  createdAt: Date
}

const SeasonSchema = new Schema<ISeason>(
  {
    year: {
      type: Number,
      required: true,
      unique: true,
    },
    isActive: {
      type: Boolean,
      default: true,
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

const Season: Model<ISeason> =
  mongoose.models.Season || mongoose.model<ISeason>("Season", SeasonSchema)

export default Season
