import { auth } from "@/app/lib/auth"
import { redirect } from "next/navigation"

/**
 * Get the current user session
 */
export async function getCurrentUser() {
  const session = await auth()
  return session?.user
}

/**
 * Require authentication - redirects to sign-in if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect("/signin")
  }
  return user
}

/**
 * Require admin access - redirects to home if not admin
 */
export async function requireAdmin() {
  const user = await requireAuth()
  if (!user.isAdmin) {
    redirect("/bracket")
  }
  return user
}
