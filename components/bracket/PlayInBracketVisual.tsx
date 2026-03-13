"use client"

import { Card, CardContent } from "@/components/ui/card"
import { TeamDisplay } from "@/components/ui/TeamDisplay"
import { Lock, X } from "lucide-react"
import type { IPlayInGame } from "@/app/lib/models/PlayInGame"
import type { IPrediction } from "@/app/lib/models/Prediction"

interface PlayInBracketVisualProps {
  games: IPlayInGame[]
  predictions?: IPrediction[]
  onGameClick?: (game: IPlayInGame | undefined) => void // Allow undefined for new games (admin only)
  isAdmin?: boolean
  isViewingOtherUser?: boolean
}

export function PlayInBracketVisual({
  games,
  predictions = [],
  onGameClick,
  isAdmin = false,
  isViewingOtherUser = false,
}: PlayInBracketVisualProps) {
  // Helper function to get or create placeholder game
  const getPlayInGame = (
    gameType: "east-7-8" | "east-9-10" | "east-final" | "west-7-8" | "west-9-10" | "west-final"
  ): IPlayInGame => {
    const existing = games.find((g) => g.gameType === gameType)
    if (existing) return existing
    
    // Create placeholder game with no teams set (will show as locked)
    // Use a past date to ensure it's locked by time as well
    const pastDate = new Date()
    pastDate.setFullYear(pastDate.getFullYear() - 1)
    
    return {
      _id: `placeholder-${gameType}`,
      seasonId: {} as any, // Placeholder seasonId
      gameType,
      team1: "TBD",
      team2: "TBD",
      startTime: pastDate,
      createdAt: new Date(),
    } as IPlayInGame
  }

  // Organize games by conference, using placeholders if they don't exist
  const eastGames = {
    "7-8": getPlayInGame("east-7-8"),
    "9-10": getPlayInGame("east-9-10"),
    final: getPlayInGame("east-final"),
  }

  const westGames = {
    "7-8": getPlayInGame("west-7-8"),
    "9-10": getPlayInGame("west-9-10"),
    final: getPlayInGame("west-final"),
  }

  return (
    <div className="w-full">
      <div className="text-center mb-6">
        <h2 className="text-xl md:text-2xl font-bold">PLAY-IN TOURNAMENT</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Western Conference */}
        <div className="space-y-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold">WESTERN CONFERENCE</h3>
          </div>
          <PlayInConferenceBracket
            games={westGames}
            predictions={predictions}
            onGameClick={onGameClick}
            isAdmin={isAdmin}
            isViewingOtherUser={isViewingOtherUser}
          />
        </div>

        {/* Eastern Conference */}
        <div className="space-y-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold">EASTERN CONFERENCE</h3>
          </div>
          <PlayInConferenceBracket
            games={eastGames}
            predictions={predictions}
            onGameClick={onGameClick}
            isAdmin={isAdmin}
            isViewingOtherUser={isViewingOtherUser}
          />
        </div>
      </div>
    </div>
  )
}

function PlayInConferenceBracket({
  games,
  predictions,
  onGameClick,
  isAdmin,
  isViewingOtherUser,
}: {
  games: {
    "7-8": IPlayInGame
    "9-10": IPlayInGame
    final: IPlayInGame
  }
  predictions: IPrediction[]
  onGameClick?: (game: IPlayInGame | undefined) => void
  isAdmin: boolean
  isViewingOtherUser: boolean
}) {
  return (
    <div className="relative space-y-6">
      {/* Games 1 & 2: Side by side */}
      <div className="grid grid-cols-2 gap-4">
        {/* Game 1: 7-8 */}
        <div>
          <div className="text-xs text-muted-foreground mb-2 text-center">
            Game 1: 7th vs 8th Seed
          </div>
          <div className="flex justify-center">
            <PlayInGameBox
              game={games["7-8"]}
              prediction={predictions.find((p) => {
                const gameId = typeof p.playInGameId === 'object' && p.playInGameId !== null
                  ? (p.playInGameId as any)._id?.toString()
                  : p.playInGameId?.toString()
                return gameId === games["7-8"]?._id?.toString()
              })}
              onClick={() => onGameClick && games["7-8"] && onGameClick(games["7-8"])}
              isAdmin={isAdmin}
              isViewingOtherUser={isViewingOtherUser}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-2 text-center">
            Winner → 7th Seed
          </div>
          <div className="text-xs text-muted-foreground text-center">
            Loser ↓
          </div>
        </div>

        {/* Game 2: 9-10 */}
        <div>
          <div className="text-xs text-muted-foreground mb-2 text-center">
            Game 2: 9th vs 10th Seed
          </div>
          <div className="flex justify-center">
            <PlayInGameBox
              game={games["9-10"]}
              prediction={predictions.find((p) => {
                const gameId = typeof p.playInGameId === 'object' && p.playInGameId !== null
                  ? (p.playInGameId as any)._id?.toString()
                  : p.playInGameId?.toString()
                return gameId === games["9-10"]?._id?.toString()
              })}
              onClick={() => onGameClick && games["9-10"] && onGameClick(games["9-10"])}
              isAdmin={isAdmin}
              isViewingOtherUser={isViewingOtherUser}
            />
          </div>
          <div className="text-xs text-muted-foreground mt-2 text-center">
            Winner ↓
          </div>
        </div>
      </div>

      {/* Game 3: Final (Loser 7-8 vs Winner 9-10) - Below Games 1 & 2 */}
      <div>
        <div className="text-xs text-muted-foreground mb-2 text-center">
          Game 3: Final (Loser 7-8 vs Winner 9-10)
        </div>
          <div className="flex justify-center">
            <PlayInGameBox
              game={games.final}
              prediction={predictions.find((p) => {
                const gameId = typeof p.playInGameId === 'object' && p.playInGameId !== null
                  ? (p.playInGameId as any)._id?.toString()
                  : p.playInGameId?.toString()
                return gameId === games.final?._id?.toString()
              })}
              onClick={() => onGameClick && games.final && onGameClick(games.final)}
              isAdmin={isAdmin}
              isViewingOtherUser={isViewingOtherUser}
            />
          </div>
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Winner → 8th Seed
        </div>
      </div>
    </div>
  )
}

function PlayInGameBox({
  game,
  prediction,
  onClick,
  isAdmin,
  isViewingOtherUser,
}: {
  game: IPlayInGame
  prediction?: IPrediction
  onClick?: () => void
  isAdmin: boolean
  isViewingOtherUser: boolean
}) {
  const isWinner1 = game.winner === game.team1
  const isWinner2 = game.winner === game.team2
  const hasPrediction1 = prediction?.predictedWinner === game.team1
  const hasPrediction2 = prediction?.predictedWinner === game.team2
  // Check if user predicted correctly
  const correctPrediction1 = hasPrediction1 && isWinner1
  const correctPrediction2 = hasPrediction2 && isWinner2
  // Check if user predicted incorrectly
  const wrongPrediction1 = hasPrediction1 && !isWinner1 && game.winner
  const wrongPrediction2 = hasPrediction2 && !isWinner2 && game.winner
  // Check if teams are set - handle "TBD", "none", empty strings, and null/undefined
  const teamsSet = 
    game.team1 && 
    game.team2 && 
    game.team1 !== "TBD" && 
    game.team2 !== "TBD" && 
    game.team1 !== "none" && 
    game.team2 !== "none" &&
    String(game.team1).trim() !== "" &&
    String(game.team2).trim() !== ""
  const now = new Date()
  // Ensure startTime is properly parsed as a Date object
  // Handle both Date objects and ISO strings from API
  let startTime: Date
  if (game.startTime instanceof Date) {
    startTime = game.startTime
  } else if (typeof game.startTime === 'string') {
    startTime = new Date(game.startTime)
  } else {
    // Fallback: create a date from the value
    startTime = new Date(game.startTime as any)
  }
  
  // Check if the date is valid
  if (isNaN(startTime.getTime())) {
    console.error("Invalid startTime for game:", game._id, game.startTime, "Type:", typeof game.startTime)
    // Default to future date if invalid
    startTime = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  }
  
  const isLockedByTime = now >= startTime
  const isLockedByWinner = !!game.winner
  const isLocked = !teamsSet || isLockedByTime || isLockedByWinner
  // Admins can always click, regular users can only click if teams are set and not locked (by time or winner)
  // When viewing another user, disable clicking
  const canClick = !isViewingOtherUser && onClick && (isAdmin || (teamsSet && !isLockedByTime && !isLockedByWinner))
  
  // Lock visibility logic:
  // - Big lock: Only when teams are NOT set (for non-admin users)
  // - Small lock: Only when teams ARE set AND (deadline passed OR winner set) (for non-admin users, or when viewing another user's locked predictions)
  // - No lock: When teams are set AND deadline has NOT passed AND winner is NOT set (user can make prediction)
  const showBigLock = !teamsSet && !isAdmin
  const showSmallLock = teamsSet && (isLockedByTime || isLockedByWinner) && (!isAdmin || isViewingOtherUser)
  // Show prediction status when teams are set and (deadline passed OR winner set)
  const showPredictionStatus = teamsSet && (isLockedByTime || isLockedByWinner) && (!isAdmin || isViewingOtherUser)

  // Debug: Log the state for this game
  if (process.env.NODE_ENV === 'development') {
    console.log(`[PlayInGameBox] ${game.gameType}:`, {
      teamsSet,
      isLockedByTime,
      showBigLock,
      showSmallLock,
      showPredictionStatus,
      team1: game.team1,
      team2: game.team2,
      startTime: startTime.toISOString(),
      now: now.toISOString()
    })
  }

  return (
    <div
      className={`relative w-full max-w-[220px] ${
        canClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
      }`}
      onClick={canClick ? onClick : undefined}
      title={
        canClick
          ? undefined
          : !teamsSet
            ? "Both teams must be set before making a prediction"
            : isLockedByWinner
              ? "This game is locked. A winner has already been determined."
              : "This game is locked. Predictions cannot be made after the deadline."
      }
    >
      <div className={showBigLock ? "opacity-40" : ""}>
        <Card className="border-2">
        <CardContent className="p-3 space-y-2">
          {/* Team 1 */}
          <div
            className={`flex items-center justify-center gap-1.5 p-2 rounded ${
              isWinner1
                ? "bg-yellow-400/40 dark:bg-yellow-500/30 border-2 border-yellow-500 dark:border-yellow-400 font-semibold"
                : hasPrediction1
                  ? "bg-primary/20 border-2 border-primary"
                  : ""
            }`}
          >
            <TeamDisplay teamName={game.team1} size="sm" showName={true} className="justify-center" />
            {correctPrediction1 && (
              <span className="text-[10px] md:text-xs font-semibold text-yellow-600 dark:text-yellow-400 shrink-0">✓</span>
            )}
            {wrongPrediction1 && (
              <X className="h-2.5 w-2.5 md:h-3 md:w-3 text-red-600 dark:text-red-400 shrink-0" />
            )}
          </div>

          <div className="text-center text-xs text-muted-foreground">vs</div>

          {/* Team 2 */}
          <div
            className={`flex items-center justify-center gap-1.5 p-2 rounded ${
              isWinner2
                ? "bg-yellow-400/40 dark:bg-yellow-500/30 border-2 border-yellow-500 dark:border-yellow-400 font-semibold"
                : hasPrediction2
                  ? "bg-primary/20 border-2 border-primary"
                  : ""
            }`}
          >
            <TeamDisplay teamName={game.team2} size="sm" showName={true} className="justify-center" />
            {correctPrediction2 && (
              <span className="text-[10px] md:text-xs font-semibold text-yellow-600 dark:text-yellow-400 shrink-0">✓</span>
            )}
            {wrongPrediction2 && (
              <X className="h-2.5 w-2.5 md:h-3 md:w-3 text-red-600 dark:text-red-400 shrink-0" />
            )}
          </div>

          {game.winner && (
            <div className="text-xs text-center text-muted-foreground pt-1 border-t">
              Winner: {game.winner}
            </div>
          )}

          {/* Prediction Status (shown when teams are set and deadline passed) */}
          {showPredictionStatus && (
            <div className="text-xs text-center pt-1 border-t pb-2">
              {prediction ? (
                <div className="text-muted-foreground">
                  Your pick: <span className="font-semibold">{prediction.predictedWinner}</span>
                </div>
              ) : (
                <div className="text-muted-foreground italic">
                  No prediction submitted
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
      
      {/* Big lock overlay (only when teams are NOT set) */}
      {showBigLock && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <Lock className="h-10 w-10 text-foreground drop-shadow-lg" />
        </div>
      )}

      {/* Small lock icon at bottom center (when teams are set but deadline passed) */}
      {/* Position it below the card content, not overlapping with prediction text */}
      {showSmallLock && (
        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 z-10 pointer-events-none">
          <Lock className="h-3 w-3 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}

function EmptyPlayInGameBox({
  onClick,
  isAdmin,
}: {
  onClick?: () => void
  isAdmin: boolean
}) {
  return (
    <div
      className={`w-full max-w-[200px] ${
        onClick ? "cursor-pointer hover:opacity-80 transition-opacity" : ""
      }`}
      onClick={onClick}
    >
      <Card className="border-2 border-dashed">
        <CardContent className="p-3 space-y-2">
          <div className="flex items-center justify-center gap-2 p-2 rounded">
            <TeamDisplay teamName="TBD" size="sm" showName={true} />
          </div>
          <div className="text-center text-xs text-muted-foreground">vs</div>
          <div className="flex items-center justify-center gap-2 p-2 rounded">
            <TeamDisplay teamName="TBD" size="sm" showName={true} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
