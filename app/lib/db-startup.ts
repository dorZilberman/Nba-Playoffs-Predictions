// This file runs a connection check on server startup
import { initDatabaseConnection } from "./db"

// Re-export for convenience
export { initDatabaseConnection as checkDatabaseConnection }

// Trigger the check when this module is imported
if (typeof window === "undefined") {
  // Use a small delay to ensure Next.js is ready
  setTimeout(() => {
    initDatabaseConnection()
  }, 500)
}
