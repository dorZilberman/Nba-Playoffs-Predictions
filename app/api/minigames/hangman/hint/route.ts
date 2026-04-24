import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import HangmanRoundState from "@/app/lib/models/HangmanRoundState"
import HangmanStreakStats from "@/app/lib/models/HangmanStreakStats"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import {
  getHangmanHintMask,
  withHangmanHintBit,
} from "@/app/lib/minigames/hangmanHintMask"
import { findPlayerById } from "@/app/lib/minigames/whoHePlayForGame"
import bundleJson from "@/data/minigames/nba-players-2025-26.json"
import type { HangmanPlayerBundle } from "@/app/lib/minigames/types"
import mongoose from "mongoose"
import { z } from "zod"

const bundle = bundleJson as HangmanPlayerBundle

const bodySchema = z.object({
  bit: z.number().int().min(0).max(3),
})

export async function POST(request: Request) {
  return runApiRoute("POST /api/minigames/hangman/hint", request, async () => {
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

    const { bit } = parsed.data
    const userId = new mongoose.Types.ObjectId(session.user.id)

    const roundDoc = await HangmanRoundState.findOne({ userId })
    if (
      !roundDoc ||
      roundDoc.inLobby === true ||
      !roundDoc.playerId ||
      roundDoc.status !== "playing"
    ) {
      return NextResponse.json({ error: "No active round" }, { status: 400 })
    }

    if (!findPlayerById(bundle, roundDoc.playerId)) {
      return NextResponse.json({ error: "Invalid player" }, { status: 400 })
    }

    const before = getHangmanHintMask(roundDoc)
    if ((before & (1 << bit)) !== 0) {
      return NextResponse.json(
        { error: "That hint is already revealed." },
        { status: 409 }
      )
    }

    const newMask = withHangmanHintBit(before, bit)
    await HangmanRoundState.findOneAndUpdate(
      { userId },
      { $set: { hintMask: newMask }, $unset: { hintsUsed: "" } },
      { runValidators: true }
    )

    const streakAfter = await HangmanStreakStats.findOneAndUpdate(
      { userId },
      {
        $inc: { runHintsUsed: 1 },
        $setOnInsert: {
          userId,
          currentStreak: 0,
          bestStreak: 0,
        },
      },
      { upsert: true, new: true, runValidators: false }
    )

    return NextResponse.json({
      hintMask: newMask,
      runHintsUsed: streakAfter?.runHintsUsed ?? 1,
    })
  })
}
