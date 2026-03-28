import { NextRequest, NextResponse } from "next/server"
import { runApiRoute } from "@/app/lib/logging/runApiRoute"
import { requireAdmin } from "@/app/lib/utils/auth"

/** Admin-only env sanity check (never expose to anonymous users). */
export async function GET(request: NextRequest) {
  return runApiRoute("GET /api/test-env", request, async () => {
  await requireAdmin()

  const hasClientId = !!process.env.GOOGLE_CLIENT_ID
  const hasClientSecret = !!process.env.GOOGLE_CLIENT_SECRET
  const hasNextAuthSecret = !!process.env.NEXTAUTH_SECRET
  const hasNextAuthUrl = !!process.env.NEXTAUTH_URL

  return NextResponse.json({
    hasClientId,
    hasClientSecret,
    hasNextAuthSecret,
    hasNextAuthUrl,
    clientIdLength: process.env.GOOGLE_CLIENT_ID?.length || 0,
    clientSecretLength: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
    nextAuthUrl: process.env.NEXTAUTH_URL,
    // Don't expose actual secrets, just check if they exist
  })
  })
}
