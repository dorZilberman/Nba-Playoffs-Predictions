import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/app/lib/utils/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import Season from "@/app/lib/models/Season"
import { z } from "zod"

export const dynamic = "force-dynamic"

const patchSeasonSchema = z.object({
  /** ISO datetime or null — early-finals lock + What-if opens at this instant */
  playoffsStartTime: z.union([z.string().min(1), z.null()]).optional(),
  /** ISO datetime or null — Analytics page/API available at or after this instant */
  playInStartTime: z.union([z.string().min(1), z.null()]).optional(),
  /** ISO datetime or null — non-admins limited to /launch and /rules until this instant */
  siteLaunchTime: z.union([z.string().min(1), z.null()]).optional(),
})

/** Raw MongoDB season document (from Season.collection) */
type SeasonCollectionDoc = {
  _id: { toString: () => string }
  year: number
  isActive: boolean
  createdAt?: unknown
  playoffsStartTime?: unknown
  playInStartTime?: unknown
  siteLaunchTime?: unknown
}

function isoFromRaw(raw: unknown): string | null {
  if (raw == null) return null
  const d = new Date(raw as string | Date | number)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

function serializeSeason(season: SeasonCollectionDoc) {
  const playoffsStartTime = isoFromRaw(season.playoffsStartTime)
  const playInStartTime = isoFromRaw(season.playInStartTime)
  const siteLaunchTime = isoFromRaw(season.siteLaunchTime)

  const createdRaw = season.createdAt
  let createdAt: string | null = null
  if (createdRaw != null) {
    const d = new Date(createdRaw as string | Date | number)
    if (!Number.isNaN(d.getTime())) {
      createdAt = d.toISOString()
    }
  }

  return {
    _id: season._id.toString(),
    year: season.year,
    isActive: season.isActive,
    createdAt,
    playoffsStartTime,
    playInStartTime,
    siteLaunchTime,
  }
}

export async function GET(request: NextRequest) {
  return runApiRoute("GET /api/admin/season", request, async () => {
  try {
    await requireAdmin()
    await dbConnect()

    const season = await Season.collection.findOne({ isActive: true })

    if (!season) {
      return NextResponse.json(
        { error: "No active season found" },
        { status: 404 }
      )
    }

    return NextResponse.json(
      serializeSeason(season as unknown as SeasonCollectionDoc)
    )
  } catch (error) {
    console.error("Error fetching season:", error)
    return NextResponse.json(
      { error: "Failed to fetch season" },
      { status: 500 }
    )
  }
  })
}

export async function PATCH(request: NextRequest) {
  return runApiRoute("PATCH /api/admin/season", request, async () => {
  try {
    await requireAdmin()
    await dbConnect()

    const season = await Season.collection.findOne({ isActive: true })
    if (!season) {
      return NextResponse.json(
        { error: "No active season found" },
        { status: 404 }
      )
    }

    const body = await request.json()
    const parsed = patchSeasonSchema.parse(body)

    const $set: Record<string, Date> = {}
    const $unset: Record<string, string> = {}

    if (parsed.playoffsStartTime !== undefined) {
      if (parsed.playoffsStartTime === null) {
        $unset.playoffsStartTime = ""
      } else {
        const d = new Date(parsed.playoffsStartTime)
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json(
            { error: "Invalid playoffsStartTime" },
            { status: 400 }
          )
        }
        $set.playoffsStartTime = d
      }
    }

    if (parsed.playInStartTime !== undefined) {
      if (parsed.playInStartTime === null) {
        $unset.playInStartTime = ""
      } else {
        const d = new Date(parsed.playInStartTime)
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json(
            { error: "Invalid playInStartTime" },
            { status: 400 }
          )
        }
        $set.playInStartTime = d
      }
    }

    if (parsed.siteLaunchTime !== undefined) {
      if (parsed.siteLaunchTime === null) {
        $unset.siteLaunchTime = ""
      } else {
        const d = new Date(parsed.siteLaunchTime)
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json(
            { error: "Invalid siteLaunchTime" },
            { status: 400 }
          )
        }
        $set.siteLaunchTime = d
      }
    }

    const updateDoc: Record<string, unknown> = {}
    if (Object.keys($set).length > 0) updateDoc.$set = $set
    if (Object.keys($unset).length > 0) updateDoc.$unset = $unset
    if (Object.keys(updateDoc).length > 0) {
      await Season.collection.updateOne({ _id: season._id }, updateDoc)
    }

    const updated = await Season.collection.findOne({ _id: season._id })
    if (!updated) {
      return NextResponse.json(
        { error: "Season not found after update" },
        { status: 404 }
      )
    }
    return NextResponse.json(
      serializeSeason(updated as unknown as SeasonCollectionDoc)
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error patching season:", error)
    return NextResponse.json(
      { error: "Failed to update season" },
      { status: 500 }
    )
  }
  })
}
