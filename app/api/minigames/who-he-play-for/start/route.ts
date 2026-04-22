import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import WhoHePlayForStats from "@/app/lib/models/WhoHePlayForStats"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import {
  pickRandomPlayer,
  WHO_HE_ROUND_MS,
} from "@/app/lib/minigames/whoHePlayForGame"
import { buildNbaTeamOptionsFromBundle } from "@/app/lib/minigames/whoHePlayForTeams"
import bundleJson from "@/data/minigames/nba-players-2025-26.json"
import type { HangmanPlayerBundle } from "@/app/lib/minigames/types"
import mongoose from "mongoose"

const bundle = bundleJson as HangmanPlayerBundle

export async function POST(request: Request) {
  return runApiRoute(
    "POST /api/minigames/who-he-play-for/start",
    request,
    async () => {
      const session = await auth()
      if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      await dbConnect()
      if (!(await userExistsInDb(session.user.id))) {
        return NextResponse.json({ error: "User not found" }, { status: 403 })
      }

      const userId = new mongoose.Types.ObjectId(session.user.id)
      const doc = await WhoHePlayForStats.findOne({ userId })
      if (!doc) {
        return NextResponse.json({ error: "No stats — refresh." }, { status: 400 })
      }

      const roundInProgress =
        !!doc.pendingPlayerId && doc.inLobby !== true

      if (roundInProgress) {
        return NextResponse.json(
          { error: "A round is already in progress." },
          { status: 409 }
        )
      }

      const player = pickRandomPlayer(bundle, doc.pendingPlayerId ?? undefined)
      doc.pendingPlayerId = player.id
      doc.inLobby = false
      doc.pendingResolved = false
      doc.roundDeadlineAt = new Date(Date.now() + WHO_HE_ROUND_MS)
      doc.markModified("roundDeadlineAt")
      await doc.save()

      const teams = buildNbaTeamOptionsFromBundle(bundle)

      return NextResponse.json({
        phase: "playing" as const,
        player: { id: player.id, displayName: player.displayName },
        teams,
        currentStreak: doc.currentStreak,
        bestStreak: doc.bestStreak,
        roundDeadlineAt: doc.roundDeadlineAt.toISOString(),
      })
    }
  )
}
