import { requireAuth } from "@/app/lib/utils/auth"
import { HangmanTileIcon } from "@/components/minigames/HangmanTileIcon"
import { MiniGameTile } from "@/components/minigames/MiniGameTile"
import { Eye, Shirt, UserRoundSearch } from "lucide-react"

export default async function MiniGamesPage() {
  await requireAuth()

  return (
    <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6 sm:space-y-8">
      <header className="space-y-2">
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Mini Games
        </h1>
        <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
          Casual games for fun. Each minigame tracks its own win streaks and
          best-streak leaderboard for everyone signed in.
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
        <li className="min-w-0">
          <MiniGameTile
            href="/minigames/hangman"
            title="Hangman"
            description="Guess the name — win streaks count toward the leaderboard."
            icon={HangmanTileIcon}
          />
        </li>
        <li className="min-w-0">
          <MiniGameTile
            href="/minigames/who-he-play-for"
            title="Who He Play For?"
            description="Pick a team for each player — build a streak and climb the board."
            icon={Shirt}
          />
        </li>
        <li className="min-w-0">
          <MiniGameTile
            href="/minigames/who-am-i"
            title="Who Am I?"
            description="Poeltl-style clues — optional photo hint, streaks, and leaderboard."
            icon={UserRoundSearch}
          />
        </li>
        <li className="min-w-0">
          <MiniGameTile
            href="/minigames/now-you-see-me"
            title="Now You See Me"
            description="Name the player from their photo — timed rounds, streaks, and leaderboard."
            icon={Eye}
          />
        </li>
      </ul>
    </div>
  )
}
