import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Logs the start of each API request and forwards correlation headers to route handlers.
 * `/api/health` only gets headers (no start log) so cron probes stay quieter vs. app routes.
 */
export function middleware(request: NextRequest) {
  const id = crypto.randomUUID()
  const startMs = Date.now()
  const path = request.nextUrl.pathname

  if (path !== "/api/health") {
    console.info(
      "[nba-app:api]",
      JSON.stringify({
        phase: "start",
        id,
        method: request.method,
        path,
        at: new Date().toISOString(),
      })
    )
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("x-request-id", id)
  requestHeaders.set("x-request-start-ms", String(startMs))

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: "/api/:path*",
}
