import { NextResponse } from "next/server"
import { requireAuth } from "@/app/lib/utils/auth"
import dbConnect from "@/app/lib/db"
import PlayInGame from "@/app/lib/models/PlayInGame"
import Season from "@/app/lib/models/Season"

export async function GET() {
  try {
    await requireAuth()
    await dbConnect()

    const season = await Season.findOne({ isActive: true })
    if (!season) {
      return NextResponse.json([])
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
