import { formatInTimeZone } from "date-fns-tz"

const IST_TIMEZONE = "Asia/Jerusalem"

/**
 * Format a UTC date to IST timezone for display
 */
export function formatToIST(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return formatInTimeZone(dateObj, IST_TIMEZONE, "MMM d, yyyy 'at' h:mm a zzz")
}

/**
 * Format a UTC date to IST timezone (date only)
 */
export function formatToISTDate(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return formatInTimeZone(dateObj, IST_TIMEZONE, "MMM d, yyyy")
}

/**
 * Format a UTC date to IST timezone (time only)
 */
export function formatToISTTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date
  return formatInTimeZone(dateObj, IST_TIMEZONE, "h:mm a zzz")
}
