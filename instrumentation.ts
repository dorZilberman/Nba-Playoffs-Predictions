/**
 * Runs once per Node when the server bundle loads (e.g. Vercel serverless / Render instance).
 * Visible in the host dashboard logs (Vercel → Logs, Render → Logs).
 *
 * How to use these logs:
 * - Each `[nba-app:boot]` = new process (deploy, restart, crash recovery, or cold start).
 *   Payload includes `host: "vercel" | "render" | "other"` plus platform ids when present.
 * - `[nba-app:mem]` ≈ every 5 minutes = RSS / heap snapshot (trend leaks vs plan limits).
 *   `/api/health` also logs memory on each probe; this fires from the app even if cron misses.
 * - `[nba-app:process] SIGTERM` = platform asked the process to stop (typical on deploy).
 * - `[nba-app:process] uncaughtException` / `unhandledRejection` = bug or bad async; often precedes restart/OOM.
 */

const MEM_LOG_INTERVAL_MS = 5 * 60 * 1000

function mb(n: number) {
  return Math.round((n / 1024 / 1024) * 10) / 10
}

function logMemorySnapshot(reason: "startup" | "interval") {
  const m = process.memoryUsage()
  console.info(
    "[nba-app:mem]",
    JSON.stringify({
      reason,
      at: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      rssMb: mb(m.rss),
      heapUsedMb: mb(m.heapUsed),
      heapTotalMb: mb(m.heapTotal),
      externalMb: mb(m.external),
      ...(m.arrayBuffers !== undefined
        ? { arrayBuffersMb: mb(m.arrayBuffers) }
        : {}),
    })
  )
}

function hostBootPayload() {
  const vercel = process.env.VERCEL === "1"
  const render = process.env.RENDER === "true" || process.env.RENDER === "1"
  const host: "vercel" | "render" | "other" = vercel
    ? "vercel"
    : render
      ? "render"
      : "other"

  return {
    host,
    at: new Date().toISOString(),
    node: process.version,
    nodeEnv: process.env.NODE_ENV,
    ...(vercel
      ? {
          vercelEnv: process.env.VERCEL_ENV ?? null,
          vercelUrl: process.env.VERCEL_URL ?? null,
          region: process.env.VERCEL_REGION ?? null,
          deploymentId: process.env.VERCEL_DEPLOYMENT_ID ?? null,
        }
      : {}),
    ...(render
      ? {
          renderServiceId: process.env.RENDER_SERVICE_ID ?? null,
          renderInstanceId: process.env.RENDER_INSTANCE_ID ?? null,
        }
      : {}),
  }
}

export async function register() {
  if (typeof process === "undefined" || process.env.NEXT_RUNTIME === "edge") {
    return
  }

  console.info(
    "[nba-app:boot] Server process started",
    JSON.stringify(hostBootPayload())
  )

  logMemorySnapshot("startup")
  setInterval(() => logMemorySnapshot("interval"), MEM_LOG_INTERVAL_MS)

  process.on("uncaughtException", (err, origin) => {
    console.error(
      "[nba-app:process] uncaughtException",
      JSON.stringify({
        at: new Date().toISOString(),
        origin,
        message: err?.message,
        stack: err?.stack?.slice(0, 2000),
      })
    )
  })

  process.on("unhandledRejection", (reason) => {
    const msg =
      reason instanceof Error
        ? { message: reason.message, stack: reason.stack?.slice(0, 2000) }
        : { message: String(reason) }
    console.error(
      "[nba-app:process] unhandledRejection",
      JSON.stringify({ at: new Date().toISOString(), ...msg })
    )
  })

  process.on("SIGTERM", () => {
    console.info(
      "[nba-app:process] SIGTERM received (normal before deploy/scale-down)",
      JSON.stringify({ at: new Date().toISOString() })
    )
  })

  process.on("SIGINT", () => {
    console.info(
      "[nba-app:process] SIGINT received",
      JSON.stringify({ at: new Date().toISOString() })
    )
  })
}
