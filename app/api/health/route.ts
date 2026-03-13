import { NextResponse } from "next/server"
import dbConnect, { initDatabaseConnection } from "@/app/lib/db"

export async function GET() {
  // Trigger startup check if not done yet
  await initDatabaseConnection()
  
  try {
    await dbConnect()
    return NextResponse.json({
      status: "healthy",
      database: "connected",
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        status: "unhealthy",
        database: "disconnected",
        error: error.message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
