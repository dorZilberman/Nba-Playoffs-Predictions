import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import WhoAmIRoundState from "@/app/lib/models/WhoAmIRoundState"
import WhoAmIStreakStats from "@/app/lib/models/WhoAmIStreakStats"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import { findPlayerById } from "@/app/lib/minigames/whoHePlayForGame"
import bundleJson from "@/data/minigames/nba-players-2025-26.json"
import type { HangmanPlayerBundle } from "@/app/lib/minigames/types"
import mongoose from "mongoose"

const bundle = bundleJson as HangmanPlayerBundle

export async function POST(request: Request) {
  return runApiRoute(
    "POST /api/minigames/who-am-i/give-up",
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

      const roundDoc = await WhoAmIRoundState.findOne({ userId })
      if (
        !roundDoc ||
        roundDoc.inLobby === true ||
        !roundDoc.secretPlayerId
      ) {
        return NextResponse.json(
          { error: "No round in progress" },
          { status: 400 }
        )
      }

      if (roundDoc.status === "won" || roundDoc.status === "lost") {
        return NextResponse.json(
          { error: "Give up is only available while playing" },
          { status: 409 }
        )
      }

      const secret = findPlayerById(bundle, roundDoc.secretPlayerId)

      const streakLean = await WhoAmIStreakStats.findOne({ userId }).lean()
      const streakBefore = streakLean?.currentStreak ?? 0

      await WhoAmIStreakStats.updateOne(
        { userId },
        { $set: { currentStreak: 0, runHintsUsed: 0 } },
        { runValidators: false }
      )

      const streakAfter = await WhoAmIStreakStats.findOne({ userId }).lean()

      await WhoAmIRoundState.findOneAndUpdate(
        { userId },
        {
          $set: {
            inLobby: true,
            secretPlayerId: null,
            photoHintUsed: false,
            guessRows: [],
            status: "playing",
          },
        },
        { runValidators: false }
      )

      return NextResponse.json({
        streakEnded: streakBefore,
        currentStreak: 0,
        bestStreak: streakAfter?.bestStreak ?? 0,
        answerPlayer: secret
          ? {
              id: secret.id,
              displayName: secret.displayName,
              photoUrl: secret.photoUrl,
            }
          : null,
      })
    }
  )
}
