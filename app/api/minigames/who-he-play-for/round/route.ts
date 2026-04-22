import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import WhoHePlayForStats from "@/app/lib/models/WhoHePlayForStats"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import { buildNbaTeamOptionsFromBundle } from "@/app/lib/minigames/whoHePlayForTeams"
import {
  findPlayerById,
  WHO_HE_ROUND_MS,
} from "@/app/lib/minigames/whoHePlayForGame"
import bundleJson from "@/data/minigames/nba-players-2025-26.json"
import type { HangmanPlayerBundle } from "@/app/lib/minigames/types"
import mongoose from "mongoose"
import { coerceMongoDate } from "@/app/lib/minigames/coerceMongoDate"

const bundle = bundleJson as HangmanPlayerBundle

/** Never cache per-user round state (timer must reflect Mongo after refresh). */
export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return runApiRoute("GET /api/minigames/who-he-play-for/round", request, async () => {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await dbConnect()
    if (!(await userExistsInDb(session.user.id))) {
      return NextResponse.json({ error: "User not found" }, { status: 403 })
    }

    const userId = new mongoose.Types.ObjectId(session.user.id)

    await WhoHePlayForStats.updateOne(
      { userId },
      {
        $setOnInsert: {
          userId,
          currentStreak: 0,
          bestStreak: 0,
          pendingPlayerId: null,
          inLobby: true,
          pendingResolved: false,
          roundDeadlineAt: null,
        },
      },
      { upsert: true }
    )

    const doc = await WhoHePlayForStats.findOne({ userId }).read("primary")
    if (!doc) {
      return NextResponse.json({ error: "Could not load stats" }, { status: 500 })
    }

    const teams = buildNbaTeamOptionsFromBundle(bundle)

    let pendingPlayer =
      doc.pendingPlayerId != null
        ? findPlayerById(bundle, doc.pendingPlayerId)
        : null

    /** Lobby iff there is no round to resume (validated against bundle). */
    if (!pendingPlayer) {
      const needsNormalize =
        doc.pendingPlayerId != null ||
        doc.pendingResolved === true ||
        doc.inLobby !== true
      if (needsNormalize) {
        doc.pendingPlayerId = null
        doc.pendingResolved = false
        doc.inLobby = true
        doc.roundDeadlineAt = null
        await doc.save()
      }
      return NextResponse.json(
        {
          phase: "lobby" as const,
          teams,
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

    /** Missing deadline on an active round — mint a fresh window (e.g. legacy docs). */
    if (!deadline) {
      deadline = new Date(Date.now() + WHO_HE_ROUND_MS)
      await WhoHePlayForStats.updateOne(
        { _id: doc._id },
        { $set: { roundDeadlineAt: deadline } }
      )
    }

    return NextResponse.json(
      {
        phase: "playing" as const,
        player: {
          id: pendingPlayer.id,
          displayName: pendingPlayer.displayName,
        },
        teams,
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
