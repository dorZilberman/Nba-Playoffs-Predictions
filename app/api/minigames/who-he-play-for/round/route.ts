import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import WhoHePlayForStats from "@/app/lib/models/WhoHePlayForStats"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import { buildNbaTeamOptionsFromBundle } from "@/app/lib/minigames/whoHePlayForTeams"
import {
  findPlayerById,
  pickRandomPlayer,
} from "@/app/lib/minigames/whoHePlayForGame"
import bundleJson from "@/data/minigames/nba-players-2025-26.json"
import type { HangmanPlayerBundle } from "@/app/lib/minigames/types"
import mongoose from "mongoose"

const bundle = bundleJson as HangmanPlayerBundle

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

    // Atomic upsert so concurrent requests (e.g. React Strict Mode double-mount in dev)
    // cannot both try to create and hit duplicate key on userId.
    const doc = await WhoHePlayForStats.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: {
          userId,
          currentStreak: 0,
          bestStreak: 0,
          pendingPlayerId: null,
        },
      },
      { upsert: true, new: true }
    )
    if (!doc) {
      return NextResponse.json({ error: "Could not load stats" }, { status: 500 })
    }

    const teams = buildNbaTeamOptionsFromBundle(bundle)

    let pendingId = doc.pendingPlayerId
    if (pendingId) {
      const existing = findPlayerById(bundle, pendingId)
      if (!existing) {
        pendingId = null
      }
    }

    if (!pendingId) {
      const next = pickRandomPlayer(bundle)
      pendingId = next.id
      doc.pendingPlayerId = pendingId
      await doc.save()
    }

    const player = findPlayerById(bundle, pendingId!)
    if (!player) {
      return NextResponse.json({ error: "Player pool error" }, { status: 500 })
    }

    return NextResponse.json({
      player: { id: player.id, displayName: player.displayName },
      teams,
      currentStreak: doc.currentStreak,
      bestStreak: doc.bestStreak,
    })
  })
}
