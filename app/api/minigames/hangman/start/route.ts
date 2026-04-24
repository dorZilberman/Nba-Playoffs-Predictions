import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import HangmanRoundState from "@/app/lib/models/HangmanRoundState"
import HangmanStreakStats from "@/app/lib/models/HangmanStreakStats"
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

      await HangmanStreakStats.updateOne(
        { userId },
        { $set: { runHintsUsed: 0 } },
        { upsert: false, runValidators: false }
      )

      await HangmanRoundState.findOneAndUpdate(
        { userId },
        {
          $set: {
            inLobby: false,
            playerId: player.id,
            guessedLetters: [],
            wrong: 0,
            hintMask: 0,
            status: "playing",
          },
          $unset: { hintsUsed: "" },
        },
        { new: true, runValidators: true }
      )

      return NextResponse.json({
        playerId: player.id,
        guessedLetters: [],
        wrong: 0,
        hintMask: 0,
        status: "playing" as const,
      })
    }
  )
}
