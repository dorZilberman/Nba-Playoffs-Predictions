import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { requireAuth } from "@/app/lib/utils/auth"
import { Button } from "@/components/ui/button"
import { WhoAmIGame } from "@/components/minigames/WhoAmIGame"

export default async function WhoAmIPage() {
  await requireAuth()

  return (
    <div className="mx-auto w-full min-w-0 max-w-4xl space-y-4 sm:space-y-6">
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
          Who Am I?
        </h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Guess the mystery NBA player from the current-season roster. Each guess fills
          a row with color clues for team, conference, division, position, height, age,
          jersey number, and nationality. You have one optional photo hint. Win streaks
          are tracked separately and have their own leaderboard.
        </p>
      </div>

      <WhoAmIGame showTitle={false} />
    </div>
  )
}
