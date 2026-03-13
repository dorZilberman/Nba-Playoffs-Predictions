import { NextResponse } from "next/server"

/**
 * Health check endpoint to keep the Render service awake
 * This endpoint can be pinged by external services (cron jobs, uptime monitors)
 * to prevent the service from going to sleep
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "nba-playoffs-predictions",
    },
    { status: 200 }
  )
}
