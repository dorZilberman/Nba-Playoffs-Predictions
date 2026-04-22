/**
 * Parse dates from Mongoose docs / BSON / loose JSON.
 * Prefer over `instanceof Date` — some values deserialize without matching Date.
 */
export function coerceMongoDate(raw: unknown): Date | null {
  if (raw == null || raw === undefined) return null

  if (typeof raw === "object" && typeof (raw as Date).getTime === "function") {
    const ms = (raw as Date).getTime()
    return Number.isFinite(ms) ? new Date(ms) : null
  }

  if (typeof raw === "string") {
    const ms = Date.parse(raw)
    return Number.isFinite(ms) ? new Date(ms) : null
  }

  if (typeof raw === "number" && Number.isFinite(raw)) {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  }

  if (
    typeof raw === "object" &&
    raw !== null &&
    "$date" in raw &&
    typeof (raw as { $date?: unknown }).$date !== "undefined"
  ) {
    const inner = (raw as { $date: string | number }).$date
    const d = new Date(inner)
    return Number.isNaN(d.getTime()) ? null : d
  }

  return null
}

/** Normalize API / DB deadline fields to ISO for client state. */
export function deadlineFieldToIso(raw: unknown): string | null {
  const d = coerceMongoDate(raw)
  return d ? d.toISOString() : null
}
