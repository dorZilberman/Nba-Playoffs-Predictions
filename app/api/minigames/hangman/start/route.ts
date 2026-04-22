import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import HangmanRoundState from "@/app/lib/models/HangmanRoundState"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import { pickRandomPlayer } from "@/app/lib/minigames/whoHePlayForGame"
import bundleJson from "@/data/minigames/nba-players-2025-26.json"
import type { HangmanPlayerBundle } from "@/app/lib/minigames/types"
import mongoose from "mongoose"

const bundle = bundleJson as HangmanPlayerBundle

export async function POST(request: Request) {
  return runApiRoute(
    "POST /api/minigames/hangman/start",
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

      const doc = await HangmanRoundState.findOne({ userId })
      if (!doc) {
        return NextResponse.json({ error: "No session — refresh." }, { status: 400 })
      }

      /**
       * Only block when there is a real round in progress. Don’t use `!doc.inLobby`:
       * legacy docs may omit `inLobby`, which is falsy and wrongly triggers 409.
       * `playerId` + playing/won means the user must finish or use Next / give up.
       */
      const ongoing =
        Boolean(doc.playerId) &&
        (doc.status === "playing" || doc.status === "won")

      if (ongoing) {
        return NextResponse.json(
          { error: "Finish or leave the current round first." },
          { status: 409 }
        )
      }

      const player = pickRandomPlayer(bundle)
      doc.inLobby = false
      doc.playerId = player.id
      doc.guessedLetters = []
      doc.wrong = 0
      doc.hintsUsed = 0
      doc.status = "playing"
      await doc.save()

      return NextResponse.json({
        playerId: player.id,
        guessedLetters: [],
        wrong: 0,
        hintsUsed: 0,
        status: "playing" as const,
      })
    }
  )
}
