import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/app/lib/utils/auth"
import dbConnect from "@/app/lib/db"
import Season from "@/app/lib/models/Season"

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

    return NextResponse.json(season)
  } catch (error) {
    console.error("Error fetching season:", error)
    return NextResponse.json(
      { error: "Failed to fetch season" },
      { status: 500 }
    )
  }
}
