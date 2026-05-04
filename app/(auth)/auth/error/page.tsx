"use client"

import { Suspense } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get("error")

  const isAccessDenied = error === "AccessDenied"

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">
            {isAccessDenied ? "Access denied" : "Sign-in error"}
          </CardTitle>
          <CardDescription className="text-base text-foreground/90">
            {isAccessDenied ? (
              <>
                You do not have permission to sign in. This site may be closed
                to new accounts—only people already invited can use Google
                sign-in. Contact the organizer if you believe this is a mistake.
              </>
            ) : (
              <>
                {error
                  ? `Something went wrong (code: ${error}). Try again later or contact support.`
                  : "Something went wrong during sign-in. Try again later."}
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            <Link
              href="/"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Return to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl font-bold">
                NBA Playoffs Predictions
              </CardTitle>
              <CardDescription>Loading…</CardDescription>
            </CardHeader>
          </Card>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  )
}
