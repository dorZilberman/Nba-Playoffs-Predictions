import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requireAuth } from "@/app/lib/utils/auth"
import { Button } from "@/components/ui/button"
import { WhoHePlayForGame } from "@/components/minigames/WhoHePlayForGame"

export default async function WhoHePlayForPage() {
  await requireAuth()

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-4 sm:space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2 w-fit shrink-0 gap-2 text-muted-foreground hover:text-foreground"
        asChild
      >
        <Link href="/minigames">
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Mini Games
        </Link>
      </Button>

      <div className="space-y-1.5 sm:space-y-2">
        <h1 className="text-balance text-2xl font-bold tracking-tight sm:text-4xl">
          Who He Play For?
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Name the NBA team for each player. Wrong answers reset your streak; best
          streaks appear on the leaderboard below.
        </p>
      </div>

      <WhoHePlayForGame />
    </div>
  )
}
