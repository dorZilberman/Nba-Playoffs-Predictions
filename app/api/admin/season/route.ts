import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/app/lib/utils/auth"
import dbConnect from "@/app/lib/db"
import Season from "@/app/lib/models/Season"
import { z } from "zod"

export const dynamic = "force-dynamic"

const patchSeasonSchema = z.object({
  /** ISO datetime string, or null to clear the deadline */
  earlyFinalsLockTime: z.union([z.string().min(1), z.null()]).optional(),
})

/** Raw MongoDB season document (from Season.collection) */
type SeasonCollectionDoc = {
  _id: { toString: () => string }
  year: number
  isActive: boolean
  createdAt?: unknown
  earlyFinalsLockTime?: unknown
}

/** Plain JSON for clients — Mongoose documents do not always serialize reliably in Route Handlers. */
function serializeSeason(season: SeasonCollectionDoc) {
  const lockRaw = season.earlyFinalsLockTime
  let earlyFinalsLockTime: string | null = null
  if (lockRaw != null) {
    const d = new Date(lockRaw as string | Date | number)
    if (!Number.isNaN(d.getTime())) {
      earlyFinalsLockTime = d.toISOString()
    }
  }

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
    earlyFinalsLockTime,
  }
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin()
    await dbConnect()

    // Read via native collection so earlyFinalsLockTime is never dropped by a
    // stale cached Mongoose model (Next.js dev / strict schema paths).
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
}

export async function PATCH(request: NextRequest) {
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

    if (parsed.earlyFinalsLockTime !== undefined) {
      if (parsed.earlyFinalsLockTime === null) {
        await Season.collection.updateOne(
          { _id: season._id },
          { $unset: { earlyFinalsLockTime: "" } }
        )
      } else {
        const d = new Date(parsed.earlyFinalsLockTime)
        if (Number.isNaN(d.getTime())) {
          return NextResponse.json(
            { error: "Invalid earlyFinalsLockTime" },
            { status: 400 }
          )
        }
        await Season.collection.updateOne(
          { _id: season._id },
          { $set: { earlyFinalsLockTime: d } }
        )
      }
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
}
