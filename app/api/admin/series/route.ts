import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/app/lib/utils/auth"
import dbConnect from "@/app/lib/db"
import Series from "@/app/lib/models/Series"
import Season from "@/app/lib/models/Season"
import { z } from "zod"

const seriesSchema = z.object({
  seasonId: z.string(),
  round: z.enum(["first", "second", "conference", "finals"]),
  conference: z.enum(["east", "west"]).nullable(),
  team1: z.string().min(1),
  team2: z.string().min(1),
  team1Seed: z.coerce.number().min(1).max(8).optional(),
  team2Seed: z.coerce.number().min(1).max(8).optional(),
  startTime: z.string().datetime(),
  currentScore: z.object({
    team1Wins: z.number().min(0).max(4),
    team2Wins: z.number().min(0).max(4),
  }),
  winner: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    await dbConnect()

    const season = await Season.findOne({ isActive: true })
    if (!season) {
      return NextResponse.json(
        { error: "No active season found" },
        { status: 404 }
      )
    }

    const series = await Series.find({ seasonId: season._id }).sort({
      round: 1,
      conference: 1,
    })

    return NextResponse.json(series)
  } catch (error) {
    console.error("Error fetching series:", error)
    return NextResponse.json(
      { error: "Failed to fetch series" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    await dbConnect()

    const body = await request.json()
    const validated = seriesSchema.parse(body)

    const series = await Series.create({
      ...validated,
      seasonId: validated.seasonId,
      startTime: new Date(validated.startTime),
    })

    return NextResponse.json(series, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating series:", error)
    return NextResponse.json(
      { error: "Failed to create series" },
      { status: 500 }
    )
  }
}
