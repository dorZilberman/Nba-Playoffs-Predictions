import mongoose, { Schema, Model } from "mongoose"

export interface ISeason {
  _id: string
  year: number
  isActive: boolean
  /** When set, Early Finals predictions lock at this time (admin-controlled) */
  earlyFinalsLockTime?: Date
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
    earlyFinalsLockTime: {
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

// Next.js dev HMR can keep an old Season model without newer schema paths;
// dropping it forces Mongoose to recompile with the current schema.
if (process.env.NODE_ENV === "development" && mongoose.models.Season) {
  delete mongoose.models.Season
}

const Season: Model<ISeason> =
  mongoose.models.Season || mongoose.model<ISeason>("Season", SeasonSchema)

export default Season
