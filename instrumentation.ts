/**
 * Runs once per Node server process (e.g. after Render cold start or deploy).
 * Visible in Render → your service → Logs.
 *
 * How to use these logs:
 * - Each `[nba-app:boot]` = new process (deploy, restart, crash recovery, or cold start).
 * - `[nba-app:process] SIGTERM` = platform asked the process to stop (typical on deploy).
 * - `[nba-app:process] uncaughtException` / `unhandledRejection` = bug or bad async; often precedes restart/OOM.
 */
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
