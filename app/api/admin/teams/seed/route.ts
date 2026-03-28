import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/app/lib/utils/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import { NBA_TEAMS_SEED } from "@/app/lib/nbaTeamsSeedData"
import Team from "@/app/lib/models/Team"

export async function POST(request: NextRequest) {
  return runApiRoute("POST /api/admin/teams/seed", request, async () => {
  try {
    await requireAdmin()
    await dbConnect()

    const coll = Team.collection
    await coll.deleteMany({})
    const now = new Date()
    const docs = NBA_TEAMS_SEED.map((t) => ({
      ...t,
      createdAt: now,
      updatedAt: now,
    }))
    const { insertedCount } = await coll.insertMany(docs)

    return NextResponse.json({
      message: `Successfully seeded ${insertedCount} teams`,
      insertedCount,
    })
  } catch (error) {
    console.error("Error seeding teams:", error)
    return NextResponse.json(
      { error: "Failed to seed teams" },
      { status: 500 }
    )
  }
  })
}
