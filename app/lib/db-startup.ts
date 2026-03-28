// This file runs a connection check on server startup
import { initDatabaseConnection } from "./db"

// Re-export for convenience
export { initDatabaseConnection as checkDatabaseConnection }

// Trigger the check when this module is imported (dev server / `next start`).
// Skip during `next build`: the root layout is loaded in many workers, and each
// would otherwise log + hit Atlas separately.
const isNextProductionBuild =
  process.env.NEXT_PHASE === "phase-production-build"

if (typeof window === "undefined" && !isNextProductionBuild) {
  // Use a small delay to ensure Next.js is ready
  setTimeout(() => {
    initDatabaseConnection()
  }, 500)
}
