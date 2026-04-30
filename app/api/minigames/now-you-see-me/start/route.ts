import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import NowYouSeeMeStats from "@/app/lib/models/NowYouSeeMeStats"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import {
  pickRandomPlayerWithPhoto,
  NOW_YOU_SEE_ME_ROUND_MS,
} from "@/app/lib/minigames/nowYouSeeMeGame"
import bundleJson from "@/data/minigames/nba-players-2025-26.json"
import type { HangmanPlayerBundle } from "@/app/lib/minigames/types"
import mongoose from "mongoose"

const bundle = bundleJson as HangmanPlayerBundle

export async function POST(request: Request) {
  return runApiRoute(
    "POST /api/minigames/now-you-see-me/start",
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
      const doc = await NowYouSeeMeStats.findOne({ userId })
      if (!doc) {
        return NextResponse.json({ error: "No stats — refresh." }, { status: 400 })
      }

      const roundInProgress =
        !!doc.pendingPlayerId && doc.inLobby !== true

      if (roundInProgress) {
        return NextResponse.json(
          { error: "A round is already in progress." },
          { status: 409 }
        )
      }

      let player: ReturnType<typeof pickRandomPlayerWithPhoto>
      try {
        player = pickRandomPlayerWithPhoto(bundle, doc.pendingPlayerId ?? undefined)
      } catch {
        return NextResponse.json(
          { error: "No roster photos available." },
          { status: 500 }
        )
      }

      doc.pendingPlayerId = player.id
      doc.inLobby = false
      doc.roundDeadlineAt = new Date(Date.now() + NOW_YOU_SEE_ME_ROUND_MS)
      doc.markModified("roundDeadlineAt")
      await doc.save()

      return NextResponse.json({
        phase: "playing" as const,
        photoUrl: player.photoUrl as string,
        currentStreak: doc.currentStreak,
        bestStreak: doc.bestStreak,
        roundDeadlineAt: doc.roundDeadlineAt.toISOString(),
      })
    }
  )
}
