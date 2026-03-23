/**
 * Runs once per Node server process (e.g. after Render cold start or deploy).
 * Visible in Render → your service → Logs.
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
    })
  )
}
