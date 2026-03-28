import { NextRequest, NextResponse } from "next/server"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import Team from "@/app/lib/models/Team"

export async function GET(request: NextRequest) {
  return runApiRoute("GET /api/teams", request, async () => {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const conference = searchParams.get("conference")
    const name = searchParams.get("name")

    const query: any = {}
    if (conference && (conference === "east" || conference === "west")) {
      query.conference = conference
    }
    if (name) {
      query.name = name
    }

    const teams = await Team.find(query).sort({ name: 1 })

    return NextResponse.json(teams)
  } catch (error) {
    console.error("Error fetching teams:", error)
    return NextResponse.json(
      { error: "Failed to fetch teams" },
      { status: 500 }
    )
  }
  })
}
