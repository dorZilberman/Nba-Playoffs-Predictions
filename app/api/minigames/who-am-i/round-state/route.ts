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
import type {
  WhoAmIGuessRowPayload,
  WhoAmIClientRound,
} from "@/app/lib/minigames/whoAmIFeedback"
import { WHO_AM_I_MAX_GUESSES } from "@/app/lib/minigames/whoAmIFeedback"
import mongoose from "mongoose"

const bundle = bundleJson as HangmanPlayerBundle

export async function GET(request: Request) {
  return runApiRoute(
    "GET /api/minigames/who-am-i/round-state",
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
        WhoAmIRoundState.findOneAndUpdate(
          { userId },
          {
            $setOnInsert: {
              userId,
              inLobby: true,
              secretPlayerId: null,
              photoHintUsed: false,
              guessRows: [],
              status: "playing",
            },
          },
          { upsert: true, new: true }
        ),
        WhoAmIStreakStats.findOne({ userId }).lean(),
      ])

      if (!roundDoc) {
        return NextResponse.json({ error: "Could not load round" }, { status: 500 })
      }

      if (roundDoc.status === "lost") {
        const fixed = await WhoAmIRoundState.findOneAndUpdate(
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
          { new: true, runValidators: false }
        )
        if (fixed) {
          roundDoc = fixed
        }
      }

      if (!roundDoc.secretPlayerId) {
        if (roundDoc.inLobby !== true) {
          await WhoAmIRoundState.updateOne(
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
      const rawRows = (roundDoc.guessRows ?? []) as WhoAmIGuessRowPayload[]
      const guessRows = [...rawRows].reverse()
      const guessesUsed = rawRows.length
      const secret = findPlayerById(bundle, roundDoc.secretPlayerId)

      let photoHintUrl: string | null = null
      if (
        !inLobby &&
        roundDoc.status === "playing" &&
        roundDoc.photoHintUsed &&
        secret?.photoUrl
      ) {
        photoHintUrl = secret.photoUrl
      }

      let answerPlayer: WhoAmIClientRound["answerPlayer"] = null
      if (!inLobby && roundDoc.status === "won" && secret) {
        answerPlayer = {
          id: secret.id,
          displayName: secret.displayName,
          photoUrl: secret.photoUrl,
        }
      }

      const round: WhoAmIClientRound | null =
        !inLobby && roundDoc.secretPlayerId
          ? {
              guessRows,
              photoHintUsed: Boolean(roundDoc.photoHintUsed),
              guessesUsed,
              maxGuesses: WHO_AM_I_MAX_GUESSES,
              status: roundDoc.status,
              photoHintUrl,
              answerPlayer,
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
