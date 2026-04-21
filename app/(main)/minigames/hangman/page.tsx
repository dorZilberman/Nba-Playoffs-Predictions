import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requireAuth } from "@/app/lib/utils/auth"
import { Button } from "@/components/ui/button"
import { HangmanGame } from "@/components/minigames/HangmanGame"

export default async function HangmanPage() {
  await requireAuth()

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <h1 className="text-balance text-2xl font-bold tracking-tight sm:text-4xl">
          Hangman
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Guess the player from the current-season roster. Wrong letters build the
          figure — seven wrong guesses and the round ends. Win streaks are saved;
          the board below ranks everyone by best streak.
        </p>
      </div>

      <HangmanGame showTitle={false} />
    </div>
  )
}
