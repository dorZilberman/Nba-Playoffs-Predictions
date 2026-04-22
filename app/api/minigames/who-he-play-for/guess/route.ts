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
  WHO_HE_ROUND_MS,
} from "@/app/lib/minigames/whoHePlayForGame"
import bundleJson from "@/data/minigames/nba-players-2025-26.json"
import type { HangmanPlayerBundle } from "@/app/lib/minigames/types"
import mongoose from "mongoose"
import { z } from "zod"

const bundle = bundleJson as HangmanPlayerBundle

const bodySchema = z.object({
  teamAbbr: z.string().min(2).max(4).optional(),
  giveUp: z.boolean().optional(),
  /** Client countdown hit zero — same outcome as a wrong guess. */
  timeUp: z.boolean().optional(),
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

    const giveUp = parsed.data.giveUp === true
    const timeUp = parsed.data.timeUp === true
    if (!giveUp && !timeUp && !parsed.data.teamAbbr) {
      return NextResponse.json({ error: "Missing team" }, { status: 400 })
    }

    const validAbbrs = new Set(
      buildNbaTeamOptionsFromBundle(bundle).map((t) => normalizeAbbr(t.abbr))
    )

    const userId = new mongoose.Types.ObjectId(session.user.id)

    const doc = await WhoHePlayForStats.findOne({ userId })
    if (!doc?.pendingPlayerId) {
      return NextResponse.json(
        { error: "Start a round first." },
        { status: 400 }
      )
    }

    if (doc.inLobby === true) {
      return NextResponse.json(
        { error: "Start a round first." },
        { status: 400 }
      )
    }

    const player = findPlayerById(bundle, doc.pendingPlayerId)
    if (!player) {
      doc.pendingPlayerId = null
      doc.inLobby = true
      doc.pendingResolved = false
      doc.roundDeadlineAt = null
      await doc.save()
      return NextResponse.json(
        { error: "Stale round — try again." },
        { status: 409 }
      )
    }

    if (giveUp) {
      const streakEnded = doc.currentStreak
      doc.currentStreak = 0
      doc.pendingPlayerId = null
      doc.inLobby = true
      doc.pendingResolved = false
      doc.roundDeadlineAt = null
      await doc.save()

      return NextResponse.json({
        gaveUp: true,
        streakEnded,
        answerAbbr: player.teamAbbr,
        teamName: player.team,
        currentStreak: doc.currentStreak,
        bestStreak: doc.bestStreak,
        phase: "lobby" as const,
      })
    }

    if (timeUp) {
      const streakEnded = doc.currentStreak
      doc.currentStreak = 0
      doc.pendingPlayerId = null
      doc.inLobby = true
      doc.pendingResolved = false
      doc.roundDeadlineAt = null
      await doc.save()

      return NextResponse.json({
        correct: false,
        gaveUp: false,
        timedOut: true,
        streakEnded,
        answerAbbr: player.teamAbbr,
        teamName: player.team,
        currentStreak: doc.currentStreak,
        bestStreak: doc.bestStreak,
        phase: "lobby" as const,
      })
    }

    const guessAbbr = normalizeAbbr(parsed.data.teamAbbr!)
    if (!validAbbrs.has(guessAbbr)) {
      return NextResponse.json({ error: "Invalid team" }, { status: 400 })
    }

    const correct = normalizeAbbr(player.teamAbbr) === guessAbbr

    let streakEndedOnWrong: number | undefined
    /** Shown after this response: next round’s player after a correct guess, else the answered player. */
    let responsePlayer = { id: player.id, displayName: player.displayName }
    let roundDeadlineIso: string | undefined

    if (correct) {
      const newStreak = doc.currentStreak + 1
      const newBest = Math.max(newStreak, doc.bestStreak)
      const nextPick = pickRandomPlayer(bundle, player.id)
      const nextDeadline = new Date(Date.now() + WHO_HE_ROUND_MS)
      const up = await WhoHePlayForStats.updateOne(
        { _id: doc._id },
        {
          $set: {
            currentStreak: newStreak,
            bestStreak: newBest,
            pendingPlayerId: nextPick.id,
            pendingResolved: false,
            inLobby: false,
            roundDeadlineAt: nextDeadline,
          },
        }
      )
      if (up.matchedCount !== 1) {
        return NextResponse.json(
          { error: "Could not save round." },
          { status: 500 }
        )
      }
      doc.currentStreak = newStreak
      doc.bestStreak = newBest
      doc.pendingPlayerId = nextPick.id
      doc.pendingResolved = false
      doc.roundDeadlineAt = nextDeadline
      roundDeadlineIso = nextDeadline.toISOString()
      responsePlayer = {
        id: nextPick.id,
        displayName: nextPick.displayName,
      }
    } else {
      streakEndedOnWrong = doc.currentStreak
      doc.currentStreak = 0
      doc.pendingPlayerId = null
      doc.inLobby = true
      doc.pendingResolved = false
      doc.roundDeadlineAt = null
      await doc.save()
    }

    return NextResponse.json({
      correct,
      gaveUp: false,
      streakEnded: streakEndedOnWrong,
      answerAbbr: player.teamAbbr,
      teamName: player.team,
      currentStreak: doc.currentStreak,
      bestStreak: doc.bestStreak,
      player: responsePlayer,
      phase: correct ? ("playing" as const) : ("lobby" as const),
      ...(roundDeadlineIso ? { roundDeadlineAt: roundDeadlineIso } : {}),
    })
  })
}
