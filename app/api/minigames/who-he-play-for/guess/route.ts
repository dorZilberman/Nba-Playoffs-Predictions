import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import WhoHePlayForStats from "@/app/lib/models/WhoHePlayForStats"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import { buildNbaTeamOptionsFromBundle } from "@/app/lib/minigames/whoHePlayForTeams"
import {
  findPlayerById,
  normalizeAbbr,
  pickRandomPlayer,
} from "@/app/lib/minigames/whoHePlayForGame"
import bundleJson from "@/data/minigames/nba-players-2025-26.json"
import type { HangmanPlayerBundle } from "@/app/lib/minigames/types"
import mongoose from "mongoose"
import { z } from "zod"

const bundle = bundleJson as HangmanPlayerBundle

const bodySchema = z.object({
  teamAbbr: z.string().min(2).max(4),
})

export async function POST(request: Request) {
  return runApiRoute("POST /api/minigames/who-he-play-for/guess", request, async () => {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    await dbConnect()
    if (!(await userExistsInDb(session.user.id))) {
      return NextResponse.json({ error: "User not found" }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 })
    }

    const guessAbbr = normalizeAbbr(parsed.data.teamAbbr)
    const validAbbrs = new Set(
      buildNbaTeamOptionsFromBundle(bundle).map((t) => normalizeAbbr(t.abbr))
    )
    if (!validAbbrs.has(guessAbbr)) {
      return NextResponse.json({ error: "Invalid team" }, { status: 400 })
    }

    const userId = new mongoose.Types.ObjectId(session.user.id)

    const doc = await WhoHePlayForStats.findOne({ userId })
    if (!doc?.pendingPlayerId) {
      return NextResponse.json(
        { error: "No active round — refresh the page." },
        { status: 400 }
      )
    }

    const player = findPlayerById(bundle, doc.pendingPlayerId)
    if (!player) {
      doc.pendingPlayerId = null
      await doc.save()
      return NextResponse.json(
        { error: "Stale round — try again." },
        { status: 409 }
      )
    }

    const correct = normalizeAbbr(player.teamAbbr) === guessAbbr

    if (correct) {
      doc.currentStreak += 1
      if (doc.currentStreak > doc.bestStreak) {
        doc.bestStreak = doc.currentStreak
      }
    } else {
      doc.currentStreak = 0
    }

    const next = pickRandomPlayer(bundle, player.id)
    doc.pendingPlayerId = next.id
    await doc.save()

    return NextResponse.json({
      correct,
      answerAbbr: player.teamAbbr,
      teamName: player.team,
      currentStreak: doc.currentStreak,
      bestStreak: doc.bestStreak,
      player: { id: next.id, displayName: next.displayName },
    })
  })
}
