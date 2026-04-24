import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import WhoAmIRoundState from "@/app/lib/models/WhoAmIRoundState"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import { findPlayerById } from "@/app/lib/minigames/whoHePlayForGame"
import bundleJson from "@/data/minigames/nba-players-2025-26.json"
import type { HangmanPlayerBundle } from "@/app/lib/minigames/types"
import {
  computeWhoAmIFeedback,
  WHO_AM_I_MAX_GUESSES,
  type WhoAmIGuessRowPayload,
} from "@/app/lib/minigames/whoAmIFeedback"
import mongoose from "mongoose"
import { z } from "zod"

const bundle = bundleJson as HangmanPlayerBundle

const bodySchema = z.object({
  guessedPlayerId: z.string().min(1),
})

export async function POST(request: Request) {
  return runApiRoute(
    "POST /api/minigames/who-am-i/guess",
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

      const { guessedPlayerId } = parsed.data
      const userId = new mongoose.Types.ObjectId(session.user.id)

      const doc = await WhoAmIRoundState.findOne({ userId })
      if (
        !doc ||
        doc.inLobby === true ||
        !doc.secretPlayerId ||
        doc.status !== "playing"
      ) {
        return NextResponse.json({ error: "No active round" }, { status: 400 })
      }

      const secret = findPlayerById(bundle, doc.secretPlayerId)
      const guess = findPlayerById(bundle, guessedPlayerId)
      if (!secret || !guess) {
        return NextResponse.json({ error: "Unknown player" }, { status: 400 })
      }

      const prior = (doc.guessRows ?? []) as WhoAmIGuessRowPayload[]
      if (prior.some((r) => r.guessedPlayerId === guessedPlayerId)) {
        return NextResponse.json(
          { error: "You already guessed this player." },
          { status: 409 }
        )
      }

      const row = computeWhoAmIFeedback(secret, guess)
      doc.guessRows = [...prior, row]

      const answerPlayer = {
        id: secret.id,
        displayName: secret.displayName,
        photoUrl: secret.photoUrl,
      }

      if (guessedPlayerId === secret.id) {
        doc.status = "won"
        await doc.save()
        const guessRows = [...(doc.guessRows as WhoAmIGuessRowPayload[])].reverse()
        return NextResponse.json({
          won: true,
          row,
          guessRows,
          guessesUsed: doc.guessRows.length,
          maxGuesses: WHO_AM_I_MAX_GUESSES,
          answerPlayer,
        })
      }

      if (doc.guessRows.length >= WHO_AM_I_MAX_GUESSES) {
        doc.status = "lost"
        await doc.save()
        const guessRows = [...(doc.guessRows as WhoAmIGuessRowPayload[])].reverse()
        return NextResponse.json({
          lost: true,
          row,
          guessRows,
          guessesUsed: doc.guessRows.length,
          maxGuesses: WHO_AM_I_MAX_GUESSES,
          answerPlayer,
        })
      }

      await doc.save()
      return NextResponse.json({
        row,
        guessesUsed: doc.guessRows.length,
        maxGuesses: WHO_AM_I_MAX_GUESSES,
        guessesRemaining: WHO_AM_I_MAX_GUESSES - doc.guessRows.length,
      })
    }
  )
}
