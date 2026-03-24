import mongoose, { Schema, Model } from "mongoose"

export interface ISeason {
  _id: string
  year: number
  isActive: boolean
  /**
   * Playoffs start: early-finals picks lock at this time; What-if opens at or after this time.
   */
  playoffsStartTime?: Date
  /** Analytics page is hidden until this instant (inclusive). */
  playInStartTime?: Date
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
    playoffsStartTime: {
      type: Date,
    },
    playInStartTime: {
      type: Date,
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

if (process.env.NODE_ENV === "development" && mongoose.models.Season) {
  delete mongoose.models.Season
}

const Season: Model<ISeason> =
  mongoose.models.Season || mongoose.model<ISeason>("Season", SeasonSchema)

export default Season
