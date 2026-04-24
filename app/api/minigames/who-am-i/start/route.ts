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
    "POST /api/minigames/who-am-i/start",
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
      if (!doc) {
        return NextResponse.json({ error: "No session — refresh." }, { status: 400 })
      }

      const ongoing =
        Boolean(doc.secretPlayerId) &&
        (doc.status === "playing" || doc.status === "won")

      if (ongoing) {
        return NextResponse.json(
          { error: "Finish or leave the current round first." },
          { status: 409 }
        )
      }

      const player = pickRandomPlayer(bundle)
      doc.inLobby = false
      doc.secretPlayerId = player.id
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
