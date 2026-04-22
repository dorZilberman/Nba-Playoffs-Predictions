import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import HangmanRoundState from "@/app/lib/models/HangmanRoundState"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import { findPlayerById } from "@/app/lib/minigames/whoHePlayForGame"
import bundleJson from "@/data/minigames/nba-players-2025-26.json"
import type { HangmanPlayerBundle } from "@/app/lib/minigames/types"
import mongoose from "mongoose"
import { z } from "zod"

const bundle = bundleJson as HangmanPlayerBundle

const MAX_WRONG = 7

const bodySchema = z.object({
  playerId: z.string(),
  guessedLetters: z.array(z.string().length(1)),
  wrong: z.number().int().min(0).max(MAX_WRONG),
  hintsUsed: z.number().int().min(0).max(3),
  status: z.enum(["playing", "won", "lost"]),
})

export async function PATCH(request: Request) {
  return runApiRoute(
    "PATCH /api/minigames/hangman/state",
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

      const userId = new mongoose.Types.ObjectId(session.user.id)
      const doc = await HangmanRoundState.findOne({ userId })
      if (!doc || doc.inLobby || !doc.playerId) {
        return NextResponse.json({ error: "No active round" }, { status: 400 })
      }

      const { playerId, guessedLetters, wrong, hintsUsed, status } = parsed.data

      if (doc.playerId !== playerId) {
        return NextResponse.json({ error: "Stale round" }, { status: 409 })
      }

      if (!findPlayerById(bundle, playerId)) {
        return NextResponse.json({ error: "Invalid player" }, { status: 400 })
      }

      doc.guessedLetters = guessedLetters.map((s) => s.toUpperCase())
      doc.wrong = wrong
      doc.hintsUsed = hintsUsed
      doc.status = status
      await doc.save()

      return NextResponse.json({ ok: true })
    }
  )
}
