import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import NowYouSeeMeStats from "@/app/lib/models/NowYouSeeMeStats"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import {
  pickRandomPlayerWithPhoto,
  NOW_YOU_SEE_ME_ROUND_MS,
} from "@/app/lib/minigames/nowYouSeeMeGame"
import { findPlayerById } from "@/app/lib/minigames/whoHePlayForGame"
import bundleJson from "@/data/minigames/nba-players-2025-26.json"
import type { HangmanPlayerBundle } from "@/app/lib/minigames/types"
import mongoose from "mongoose"
import { z } from "zod"

const bundle = bundleJson as HangmanPlayerBundle

const bodySchema = z.object({
  guessedPlayerId: z.string().min(1).optional(),
  giveUp: z.boolean().optional(),
  timeUp: z.boolean().optional(),
})

export async function POST(request: Request) {
  return runApiRoute("POST /api/minigames/now-you-see-me/guess", request, async () => {
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
    if (!giveUp && !timeUp && !parsed.data.guessedPlayerId) {
      return NextResponse.json({ error: "Missing player" }, { status: 400 })
    }

    const userId = new mongoose.Types.ObjectId(session.user.id)

    const doc = await NowYouSeeMeStats.findOne({ userId })
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
    if (!player || !player.photoUrl) {
      doc.pendingPlayerId = null
      doc.inLobby = true
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
      doc.roundDeadlineAt = null
      await doc.save()

      return NextResponse.json({
        gaveUp: true,
        streakEnded,
        answerDisplayName: player.displayName,
        answerPhotoUrl: player.photoUrl,
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
      doc.roundDeadlineAt = null
      await doc.save()

      return NextResponse.json({
        correct: false,
        gaveUp: false,
        timedOut: true,
        streakEnded,
        answerDisplayName: player.displayName,
        answerPhotoUrl: player.photoUrl,
        currentStreak: doc.currentStreak,
        bestStreak: doc.bestStreak,
        phase: "lobby" as const,
      })
    }

    const guessedId = parsed.data.guessedPlayerId!
    const guessPlayer = findPlayerById(bundle, guessedId)
    if (!guessPlayer) {
      return NextResponse.json({ error: "Unknown player" }, { status: 400 })
    }

    const correct = guessedId === player.id

    let streakEndedOnWrong: number | undefined
    let responsePhotoUrl: string | undefined
    let roundDeadlineIso: string | undefined

    if (correct) {
      const newStreak = doc.currentStreak + 1
      const newBest = Math.max(newStreak, doc.bestStreak)
      let nextPick: ReturnType<typeof pickRandomPlayerWithPhoto>
      try {
        nextPick = pickRandomPlayerWithPhoto(bundle, player.id)
      } catch {
        return NextResponse.json(
          { error: "Could not pick next player." },
          { status: 500 }
        )
      }
      const nextDeadline = new Date(Date.now() + NOW_YOU_SEE_ME_ROUND_MS)
      const up = await NowYouSeeMeStats.updateOne(
        { _id: doc._id },
        {
          $set: {
            currentStreak: newStreak,
            bestStreak: newBest,
            pendingPlayerId: nextPick.id,
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
      doc.roundDeadlineAt = nextDeadline
      responsePhotoUrl = nextPick.photoUrl as string
      roundDeadlineIso = nextDeadline.toISOString()
    } else {
      streakEndedOnWrong = doc.currentStreak
      doc.currentStreak = 0
      doc.pendingPlayerId = null
      doc.inLobby = true
      doc.roundDeadlineAt = null
      await doc.save()
    }

    return NextResponse.json({
      correct,
      gaveUp: false,
      streakEnded: streakEndedOnWrong,
      answerDisplayName: player.displayName,
      answerPhotoUrl: player.photoUrl,
      currentStreak: doc.currentStreak,
      bestStreak: doc.bestStreak,
      photoUrl: responsePhotoUrl,
      phase: correct ? ("playing" as const) : ("lobby" as const),
      ...(roundDeadlineIso ? { roundDeadlineAt: roundDeadlineIso } : {}),
    })
  })
}
