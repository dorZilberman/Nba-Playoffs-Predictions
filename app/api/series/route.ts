import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/app/lib/utils/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import Series from "@/app/lib/models/Series"
import Season from "@/app/lib/models/Season"

export async function GET(request: NextRequest) {
  return runApiRoute("GET /api/series", request, async () => {
  try {
    await requireAuth()
    await dbConnect()

    const season = await Season.findOne({ isActive: true })
    if (!season) {
      return NextResponse.json([])
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
  })
}
