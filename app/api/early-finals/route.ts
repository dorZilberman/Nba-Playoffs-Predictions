import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/app/lib/utils/auth"
import dbConnect from "@/app/lib/db"
import Season from "@/app/lib/models/Season"
import Team from "@/app/lib/models/Team"
import EarlyFinalsPrediction from "@/app/lib/models/EarlyFinalsPrediction"
import { isEarlyFinalsLocked } from "@/app/lib/locking/earlyFinalsLock"
import { z } from "zod"
import mongoose from "mongoose"

const putBodySchema = z.object({
  eastFinalist: z.string().min(1),
  westFinalist: z.string().min(1),
  nbaChampion: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    await dbConnect()

    const rawSeason = await Season.collection.findOne({ isActive: true })
    if (!rawSeason) {
      return NextResponse.json({
        seasonId: null,
        earlyFinalsLockTime: null,
        locked: false,
        eastTeams: [],
        westTeams: [],
        prediction: null,
        canEdit: false,
      })
    }

    const userIdParam = request.nextUrl.searchParams.get("userId") || user.id
    const isViewingOtherUser = userIdParam !== user.id
    const lockRaw = rawSeason.earlyFinalsLockTime
    const locked = isEarlyFinalsLocked({
      earlyFinalsLockTime:
        lockRaw != null ? new Date(lockRaw as Date) : undefined,
    })

    const [eastTeams, westTeams] = await Promise.all([
      Team.find({ conference: "east" }).sort({ name: 1 }).lean(),
      Team.find({ conference: "west" }).sort({ name: 1 }).lean(),
    ])

    let predictionDoc = await EarlyFinalsPrediction.findOne({
      userId: new mongoose.Types.ObjectId(userIdParam),
      seasonId: rawSeason._id,
    }).lean()

    let prediction = predictionDoc
      ? {
          eastFinalist: predictionDoc.eastFinalist,
          westFinalist: predictionDoc.westFinalist,
          nbaChampion: predictionDoc.nbaChampion,
        }
      : null

    if (isViewingOtherUser && !locked) {
      prediction = null
    }

    const canEdit =
      !isViewingOtherUser && !locked

    const lockIso =
      lockRaw != null
        ? new Date(lockRaw as Date).toISOString()
        : null

    return NextResponse.json({
      seasonId: rawSeason._id.toString(),
      earlyFinalsLockTime: lockIso,
      locked,
      eastTeams: eastTeams.map((t) => ({ name: t.name, logoUrl: t.logoUrl })),
      westTeams: westTeams.map((t) => ({ name: t.name, logoUrl: t.logoUrl })),
      prediction,
      canEdit,
    })
  } catch (error) {
    console.error("Error in GET /api/early-finals:", error)
    return NextResponse.json(
      { error: "Failed to load early finals" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth()
    await dbConnect()

    const rawSeason = await Season.collection.findOne({ isActive: true })
    if (!rawSeason) {
      return NextResponse.json({ error: "No active season" }, { status: 404 })
    }

    const lockRawPut = rawSeason.earlyFinalsLockTime
    if (
      isEarlyFinalsLocked({
        earlyFinalsLockTime:
          lockRawPut != null ? new Date(lockRawPut as Date) : undefined,
      })
    ) {
      return NextResponse.json(
        { error: "Early Finals predictions are locked" },
        { status: 400 }
      )
    }

    const body = await request.json()
    const data = putBodySchema.parse(body)

    if (
      data.nbaChampion !== data.eastFinalist &&
      data.nbaChampion !== data.westFinalist
    ) {
      return NextResponse.json(
        {
          error:
            "NBA champion must be the same as either your East or West pick",
        },
        { status: 400 }
      )
    }

    const [eastOk, westOk] = await Promise.all([
      Team.exists({ name: data.eastFinalist, conference: "east" }),
      Team.exists({ name: data.westFinalist, conference: "west" }),
    ])

    if (!eastOk || !westOk) {
      return NextResponse.json(
        { error: "Invalid team selection for conference" },
        { status: 400 }
      )
    }

    const doc = await EarlyFinalsPrediction.findOneAndUpdate(
      {
        userId: new mongoose.Types.ObjectId(user.id),
        seasonId: rawSeason._id,
      },
      {
        userId: new mongoose.Types.ObjectId(user.id),
        seasonId: rawSeason._id,
        eastFinalist: data.eastFinalist,
        westFinalist: data.westFinalist,
        nbaChampion: data.nbaChampion,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    )

    return NextResponse.json({
      prediction: {
        eastFinalist: doc.eastFinalist,
        westFinalist: doc.westFinalist,
        nbaChampion: doc.nbaChampion,
      },
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      )
    }
    console.error("Error in PUT /api/early-finals:", error)
    return NextResponse.json(
      { error: "Failed to save early finals prediction" },
      { status: 500 }
    )
  }
}
