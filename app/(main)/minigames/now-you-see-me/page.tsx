import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requireAuth } from "@/app/lib/utils/auth"
import { Button } from "@/components/ui/button"
import { NowYouSeeMeGame } from "@/components/minigames/NowYouSeeMeGame"

export default async function NowYouSeeMePage() {
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
          Now You See Me
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Guess each NBA player from their photo—you have one minute per round.
          Wrong guesses, time-outs, and give-ups reset your streak; best streaks
          show on the leaderboard below.
        </p>
      </div>

      <NowYouSeeMeGame />
    </div>
  )
}
