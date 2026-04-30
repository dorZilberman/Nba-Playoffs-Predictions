import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import NowYouSeeMeStats from "@/app/lib/models/NowYouSeeMeStats"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import { WHO_HE_ROUND_MS } from "@/app/lib/minigames/nowYouSeeMeGame"
import { findPlayerById } from "@/app/lib/minigames/whoHePlayForGame"
import bundleJson from "@/data/minigames/nba-players-2025-26.json"
import type { HangmanPlayerBundle } from "@/app/lib/minigames/types"
import mongoose from "mongoose"
import { coerceMongoDate } from "@/app/lib/minigames/coerceMongoDate"

const bundle = bundleJson as HangmanPlayerBundle

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return runApiRoute("GET /api/minigames/now-you-see-me/round", request, async () => {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await dbConnect()
    if (!(await userExistsInDb(session.user.id))) {
      return NextResponse.json({ error: "User not found" }, { status: 403 })
    }

    const userId = new mongoose.Types.ObjectId(session.user.id)

    await NowYouSeeMeStats.updateOne(
      { userId },
      {
        $setOnInsert: {
          userId,
          currentStreak: 0,
          bestStreak: 0,
          pendingPlayerId: null,
          inLobby: true,
          roundDeadlineAt: null,
        },
      },
      { upsert: true }
    )

    const doc = await NowYouSeeMeStats.findOne({ userId }).read("primary")
    if (!doc) {
      return NextResponse.json({ error: "Could not load stats" }, { status: 500 })
    }

    let pendingPlayer =
      doc.pendingPlayerId != null
        ? findPlayerById(bundle, doc.pendingPlayerId)
        : null

    if (
      pendingPlayer &&
      (!pendingPlayer.photoUrl || pendingPlayer.photoUrl.trim().length === 0)
    ) {
      pendingPlayer = null
    }

    if (!pendingPlayer) {
      const needsNormalize =
        doc.pendingPlayerId != null || doc.inLobby !== true
      if (needsNormalize) {
        doc.pendingPlayerId = null
        doc.inLobby = true
        doc.roundDeadlineAt = null
        await doc.save()
      }
      return NextResponse.json(
        {
          phase: "lobby" as const,
          currentStreak: doc.currentStreak,
          bestStreak: doc.bestStreak,
        },
        {
          headers: {
            "Cache-Control": "private, no-store, max-age=0, must-revalidate",
          },
        }
      )
    }

    let deadline = coerceMongoDate(doc.roundDeadlineAt)

    if (!deadline) {
      deadline = new Date(Date.now() + WHO_HE_ROUND_MS)
      await NowYouSeeMeStats.updateOne(
        { _id: doc._id },
        { $set: { roundDeadlineAt: deadline } }
      )
    }

    return NextResponse.json(
      {
        phase: "playing" as const,
        photoUrl: pendingPlayer.photoUrl as string,
        currentStreak: doc.currentStreak,
        bestStreak: doc.bestStreak,
        roundDeadlineAt: deadline.toISOString(),
      },
      {
        headers: {
          "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        },
      }
    )
  })
}
