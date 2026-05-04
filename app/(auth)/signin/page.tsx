"use client"

import { Suspense } from "react"
import { signIn } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function SignInContent() {
  const searchParams = useSearchParams()
  const oauthError = searchParams.get("error")

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">NBA Playoffs Predictions</CardTitle>
          <CardDescription>
            Sign in with your Google account to make predictions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {oauthError === "AccessDenied" && (
            <p className="text-sm text-destructive text-pretty" role="alert">
              Sign-in was blocked. If this site is closed to new members, only
              accounts that already exist can sign in—ask an admin to add you or
              to turn on &quot;Allow new users to join.&quot;
            </p>
          )}
          <Button
            onClick={() => signIn("google", { callbackUrl: "/bracket" })}
            className="w-full"
            size="lg"
          >
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignInPage() {
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
      <SignInContent />
    </Suspense>
  )
}
