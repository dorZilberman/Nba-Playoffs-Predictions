/**
 * Wraps an App Router API handler to log end timing (and errors).
 * Pair with root `middleware.ts`, which logs `start` and sets `x-request-id` / `x-request-start-ms`.
 */
export async function runApiRoute<T extends Response>(
  routeLabel: string,
  request: Request,
  work: () => Promise<T>
): Promise<T> {
  const id = request.headers.get("x-request-id") ?? "—"
  const rawStart = request.headers.get("x-request-start-ms")
  const startMs = rawStart != null ? Number(rawStart) : Date.now()

  try {
    const res = await work()
    console.info(
      "[nba-app:api]",
      JSON.stringify({
        phase: "end",
        route: routeLabel,
        id,
        ms: Date.now() - startMs,
        status: res.status,
      })
    )
    return res
  } catch (err) {
    console.error(
      "[nba-app:api]",
      JSON.stringify({
        phase: "error",
        route: routeLabel,
        id,
        ms: Date.now() - startMs,
        error: err instanceof Error ? err.message : String(err),
      })
    )
    throw err
  }
}
