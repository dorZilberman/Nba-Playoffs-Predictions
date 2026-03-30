import { NextResponse } from "next/server"
import dbConnect from "@/app/lib/db"
import Season from "@/app/lib/models/Season"

export const dynamic = "force-dynamic"

function isoFromRaw(raw: unknown): string | null {
  if (raw == null) return null
  const d = new Date(raw as string | Date | number)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export async function GET() {
  try {
    await dbConnect()
    const season = await Season.collection.findOne(
      { isActive: true },
      { projection: { siteLaunchTime: 1 } }
    )
    const siteLaunchTime = isoFromRaw(season?.siteLaunchTime)
    return NextResponse.json({ siteLaunchTime })
  } catch (e) {
    console.error("GET /api/season/site-launch:", e)
    return NextResponse.json(
      { error: "Failed to load launch time", siteLaunchTime: null },
      { status: 500 }
    )
  }
}
