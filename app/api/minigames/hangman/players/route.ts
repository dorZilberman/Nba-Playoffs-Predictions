import { NextResponse } from "next/server"
import { requireAuth } from "@/app/lib/utils/auth"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import type { HangmanPlayerBundle } from "@/app/lib/minigames/types"
import bundle from "@/data/minigames/nba-players-2025-26.json"

export async function GET(request: Request) {
  return runApiRoute("GET /api/minigames/hangman/players", request, async () => {
    await requireAuth()
    const data = bundle as HangmanPlayerBundle
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    })
  })
}
