import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import HangmanRoundState from "@/app/lib/models/HangmanRoundState"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import mongoose from "mongoose"

/** After a natural loss (streak already updated via round-result). */
export async function POST(request: Request) {
  return runApiRoute(
    "POST /api/minigames/hangman/to-lobby",
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
        return NextResponse.json({ error: "No session" }, { status: 400 })
      }

      await HangmanRoundState.findOneAndUpdate(
        { userId },
        {
          $set: {
            inLobby: true,
            playerId: null,
            guessedLetters: [],
            wrong: 0,
            hintMask: 0,
            status: "playing",
          },
          $unset: { hintsUsed: "" },
        },
        { runValidators: false }
      )

      return NextResponse.json({ ok: true })
    }
  )
}
