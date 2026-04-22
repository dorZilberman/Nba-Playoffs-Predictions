import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import HangmanRoundState from "@/app/lib/models/HangmanRoundState"
import HangmanStreakStats from "@/app/lib/models/HangmanStreakStats"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import mongoose from "mongoose"

export async function POST(request: Request) {
  return runApiRoute(
    "POST /api/minigames/hangman/give-up",
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

      const roundDoc = await HangmanRoundState.findOne({ userId })
      /** Use strict true — missing `inLobby` on legacy docs must not count as “in lobby”. */
      if (!roundDoc || roundDoc.inLobby === true || !roundDoc.playerId) {
        return NextResponse.json(
          { error: "No round in progress" },
          { status: 400 }
        )
      }

      /** Only block won / lost; missing status on legacy rows means “playing”. */
      if (roundDoc.status === "won" || roundDoc.status === "lost") {
        return NextResponse.json(
          { error: "Give up is only available while playing" },
          { status: 409 }
        )
      }

      const streakLean = await HangmanStreakStats.findOne({ userId }).lean()
      const streakBefore = streakLean?.currentStreak ?? 0

      /** Only `$set` — never mix `$set.currentStreak` with `$setOnInsert.currentStreak` (MongoDB conflict → 500). */
      await HangmanStreakStats.updateOne(
        { userId },
        { $set: { currentStreak: 0 } },
        { runValidators: false }
      )

      const streakAfter = await HangmanStreakStats.findOne({ userId }).lean()

      /** Avoid `.save()` — legacy fields can fail Mongoose validation on full document save. */
      await HangmanRoundState.findOneAndUpdate(
        { userId },
        {
          $set: {
            inLobby: true,
            playerId: null,
            guessedLetters: [],
            wrong: 0,
            hintsUsed: 0,
            status: "playing",
          },
        },
        { runValidators: false }
      )

      return NextResponse.json({
        streakEnded: streakBefore,
        currentStreak: 0,
        bestStreak: streakAfter?.bestStreak ?? 0,
      })
    }
  )
}
