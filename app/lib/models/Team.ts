import mongoose, { Schema, Model } from "mongoose"

export interface ITeam {
  _id: string
  name: string
  conference: "east" | "west"
  seed?: number
  logoUrl: string
  /** Main brand color as #RRGGBB (used in charts, etc.) */
  primaryColor?: string
  createdAt: Date
  updatedAt: Date
}

const TeamSchema = new Schema<ITeam>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    conference: {
      type: String,
      enum: ["east", "west"],
      required: true,
    },
    seed: {
      type: Number,
      min: 1,
      max: 15,
    },
    logoUrl: {
      type: String,
      required: true,
    },
    primaryColor: {
      type: String,
      match: /^#[0-9A-Fa-f]{6}$/,
    },
  },
  {
    timestamps: true,
  }
)

const Team: Model<ITeam> =
  mongoose.models.Team || mongoose.model<ITeam>("Team", TeamSchema)

export default Team
