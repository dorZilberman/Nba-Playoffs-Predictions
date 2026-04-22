import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import HangmanRoundState from "@/app/lib/models/HangmanRoundState"
import HangmanStreakStats from "@/app/lib/models/HangmanStreakStats"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import mongoose from "mongoose"

export async function GET(request: Request) {
  return runApiRoute(
    "GET /api/minigames/hangman/round-state",
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

      let [roundDoc, streakDoc] = await Promise.all([
        HangmanRoundState.findOneAndUpdate(
          { userId },
          {
            $setOnInsert: {
              userId,
              inLobby: true,
              playerId: null,
              guessedLetters: [],
              wrong: 0,
              hintsUsed: 0,
              status: "playing",
            },
          },
          { upsert: true, new: true }
        ),
        HangmanStreakStats.findOne({ userId }).lean(),
      ])

      if (!roundDoc) {
        return NextResponse.json({ error: "Could not load round" }, { status: 500 })
      }

      /**
       * Lost rounds must land in lobby with “Start New Game”. Older sessions could
       * PATCH `status: lost` but never run `to-lobby` (refresh, offline, race).
       * Use an atomic $set (not .save()) so bad legacy values (e.g. hints out of range)
       * don’t trigger Mongoose validation and 500 the whole route.
       */
      if (roundDoc.status === "lost") {
        const fixed = await HangmanRoundState.findOneAndUpdate(
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
          { new: true, runValidators: false }
        )
        if (fixed) {
          roundDoc = fixed
        }
      }

      if (roundDoc.status === "lost") {
        return NextResponse.json({
          inLobby: true,
          currentStreak: streakDoc?.currentStreak ?? 0,
          bestStreak: streakDoc?.bestStreak ?? 0,
          round: null,
        })
      }

      /**
       * Without a player id there is no puzzle — must be lobby. Legacy rows can have
       * `inLobby: false` + `playerId: null`, which used to JSON as inLobby:false, round:null
       * and broke the client (nothing rendered).
       */
      if (!roundDoc.playerId) {
        if (roundDoc.inLobby !== true) {
          await HangmanRoundState.updateOne(
            { userId },
            { $set: { inLobby: true } },
            { runValidators: false }
          )
        }
        return NextResponse.json({
          inLobby: true,
          currentStreak: streakDoc?.currentStreak ?? 0,
          bestStreak: streakDoc?.bestStreak ?? 0,
          round: null,
        })
      }

      const inLobby = roundDoc.inLobby === true
      const round =
        !inLobby && roundDoc.playerId
          ? {
              playerId: roundDoc.playerId,
              guessedLetters: roundDoc.guessedLetters ?? [],
              wrong: roundDoc.wrong,
              hintsUsed: roundDoc.hintsUsed,
              status: roundDoc.status,
            }
          : null

      return NextResponse.json({
        inLobby,
        currentStreak: streakDoc?.currentStreak ?? 0,
        bestStreak: streakDoc?.bestStreak ?? 0,
        round,
      })
    }
  )
}
