import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import WhoAmIRoundState from "@/app/lib/models/WhoAmIRoundState"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import { findPlayerById } from "@/app/lib/minigames/whoHePlayForGame"
import bundleJson from "@/data/minigames/nba-players-2025-26.json"
import type { HangmanPlayerBundle } from "@/app/lib/minigames/types"
import mongoose from "mongoose"

const bundle = bundleJson as HangmanPlayerBundle

export async function POST(request: Request) {
  return runApiRoute(
    "POST /api/minigames/who-am-i/photo-hint",
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

      if (
        !doc ||
        doc.inLobby === true ||
        !doc.secretPlayerId ||
        doc.status !== "playing"
      ) {
        return NextResponse.json({ error: "No active round" }, { status: 400 })
      }

      if (doc.photoHintUsed) {
        return NextResponse.json(
          { error: "Photo hint already used." },
          { status: 409 }
        )
      }

      const secret = findPlayerById(bundle, doc.secretPlayerId)
      doc.photoHintUsed = true
      await doc.save()

      return NextResponse.json({
        photoHintUsed: true,
        photoHintUrl: secret?.photoUrl ?? null,
      })
    }
  )
}
