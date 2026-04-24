import { NextResponse } from "next/server"
import { auth } from "@/app/lib/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import dbConnect from "@/app/lib/db"
import WhoAmIRoundState from "@/app/lib/models/WhoAmIRoundState"
import { userExistsInDb } from "@/app/lib/utils/userDbGate"
import mongoose from "mongoose"

export async function POST(request: Request) {
  return runApiRoute(
    "POST /api/minigames/who-am-i/to-lobby",
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
        return NextResponse.json({ error: "No session" }, { status: 400 })
      }

      doc.inLobby = true
      doc.secretPlayerId = null
      doc.photoHintUsed = false
      doc.guessRows = []
      doc.status = "playing"
      await doc.save()

      return NextResponse.json({ ok: true })
    }
  )
}
