import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import WhoAmIRoundState from "@/app/lib/models/WhoAmIRoundState"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import { pickRandomPlayer } from "@/app/lib/minigames/whoHePlayForGame"
import bundleJson from "@/data/minigames/nba-players-2025-26.json"
import type { HangmanPlayerBundle } from "@/app/lib/minigames/types"
import mongoose from "mongoose"
import { WHO_AM_I_MAX_GUESSES } from "@/app/lib/minigames/whoAmIFeedback"

const bundle = bundleJson as HangmanPlayerBundle

export async function POST(request: Request) {
  return runApiRoute(
    "POST /api/minigames/who-am-i/next",
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
      const doc = await WhoAmIRoundState.findOne({ userId })

      if (!doc || doc.inLobby || !doc.secretPlayerId) {
        return NextResponse.json({ error: "No active round" }, { status: 400 })
      }

      if (doc.status !== "won") {
        return NextResponse.json(
          { error: "Win this round first" },
          { status: 409 }
        )
      }

      const next = pickRandomPlayer(bundle, doc.secretPlayerId)
      doc.secretPlayerId = next.id
      doc.photoHintUsed = false
      doc.guessRows = []
      doc.status = "playing"
      await doc.save()

      return NextResponse.json({
        status: "playing" as const,
        guessesUsed: 0,
        maxGuesses: WHO_AM_I_MAX_GUESSES,
        photoHintUsed: false,
        guessRows: [] as const,
      })
    }
  )
}
