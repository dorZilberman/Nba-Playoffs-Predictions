/**
 * Runs once per Node server process (e.g. after Render cold start or deploy).
 * Visible in Render → your service → Logs.
 *
 * How to use these logs:
 * - Each `[nba-app:boot]` = new process (deploy, restart, crash recovery, or cold start).
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

export async function register() {
  // Runs in Node when the server process starts (e.g. Render cold start / deploy).
  if (typeof process === "undefined" || process.env.NEXT_RUNTIME === "edge") {
    return
  }

  console.info(
    "[nba-app:boot] Server process started",
    JSON.stringify({
      at: new Date().toISOString(),
      node: process.version,
      nodeEnv: process.env.NODE_ENV,
      render: process.env.RENDER ? "true" : "false",
      serviceId: process.env.RENDER_SERVICE_ID ?? null,
      instance: process.env.RENDER_INSTANCE_ID ?? null,
    })
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
