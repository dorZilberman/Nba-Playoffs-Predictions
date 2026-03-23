import { NextResponse } from "next/server"

/** No static caching; always fresh 200 for uptime probes. */
export const dynamic = "force-dynamic"

const body = {
  status: "ok",
  service: "nba-playoffs-predictions",
} as const

function logHealth(method: string, request: Request, status: number) {
  const ua = request.headers.get("user-agent") ?? ""
  const fwd = request.headers.get("x-forwarded-for") ?? ""
  console.info(
    "[nba-app:health]",
    JSON.stringify({
      method,
      status,
      at: new Date().toISOString(),
      ua: ua.slice(0, 160),
      forwardedFor: fwd.slice(0, 80) || undefined,
    })
  )
}

function okResponse() {
  return NextResponse.json(
    { ...body, timestamp: new Date().toISOString() },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  )
}

/**
 * Health check for Render / uptime monitors. Keep this route free of DB and auth.
 * Intermittent 503 while the instance is waking is from the host, not this handler —
 * use probe timeouts ≥ 60s and retries on your cron/monitor.
 */
export async function GET(request: Request) {
  try {
    logHealth("GET", request, 200)
    return okResponse()
  } catch (err) {
    console.error(
      "[nba-app:health]",
      "GET failed",
      err instanceof Error ? err.message : err
    )
    throw err
  }
}

/** Many cron services use HEAD — support it so probes stay minimal. */
export async function HEAD(request: Request) {
  try {
    logHealth("HEAD", request, 200)
    return new NextResponse(null, {
      status: 200,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    })
  } catch (err) {
    console.error(
      "[nba-app:health]",
      "HEAD failed",
      err instanceof Error ? err.message : err
    )
    throw err
  }
}
