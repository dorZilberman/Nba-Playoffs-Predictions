import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/app/lib/utils/auth"
import dbConnect from "@/app/lib/db"
import PlayInGame from "@/app/lib/models/PlayInGame"
import Season from "@/app/lib/models/Season"
import { z } from "zod"

const playInGameSchema = z.object({
  seasonId: z.string(),
  gameType: z.enum([
    "east-7-8",
    "east-9-10",
    "west-7-8",
    "west-9-10",
    "east-final",
    "west-final",
  ]),
  team1: z.string().min(1),
  team2: z.string().min(1),
  startTime: z.string().datetime(),
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

    const games = await PlayInGame.find({ seasonId: season._id }).sort({
      gameType: 1,
    })

    return NextResponse.json(games)
  } catch (error) {
    console.error("Error fetching Play-In games:", error)
    return NextResponse.json(
      { error: "Failed to fetch Play-In games" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    await dbConnect()

    const body = await request.json()
    const validated = playInGameSchema.parse(body)

    const game = await PlayInGame.create({
      ...validated,
      seasonId: validated.seasonId,
      startTime: new Date(validated.startTime),
    })

    return NextResponse.json(game, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error creating Play-In game:", error)
    return NextResponse.json(
      { error: "Failed to create Play-In game" },
      { status: 500 }
    )
  }
}
