import { requireAuth } from "@/app/lib/utils/auth"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ROUND_BASE_VALUES } from "@/app/lib/scoring/types"

export default async function RulesPage() {
  await requireAuth()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-3xl font-bold">Rules & Scoring</h1>

      <Card>
        <CardHeader>
          <CardTitle>How Predictions Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Make your predictions for the 2026 NBA Playoffs! You can predict the
            outcome of each playoff series and Play-In game, plus an early finals
            predictions round before the Play-In.
          </p>
          <div>
            <h3 className="font-semibold mb-2">Early Finals Predictions:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                Pick one team from the East and one from the West that you think
                will win their conference and reach the NBA Finals
              </li>
              <li>
                Then pick the NBA champion — it must be one of those two teams
              </li>
              <li>
                You can edit your prediction as many times as you want until the
                series locks
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">For Playoff Series:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Select the team you think will advance</li>
              <li>Predict the exact final series score (e.g., 4-0, 4-1, 4-2, 4-3)</li>
              <li>You can edit your prediction as many times as you want until the series locks</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold mb-2">For Play-In Games:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Simply select the winner of each Play-In game</li>
              <li>
                You can edit your prediction as many times as you want until the
                game locks
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>When Predictions Lock</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p>
            Predictions lock individually per series or game. A series or game
            locks when its start time arrives. Early Finals predictions lock at
            the start time of the first playoff game.
          </p>
          <div className="bg-muted p-4 rounded">
            <p className="text-sm">
              <strong>Lock Deadline:</strong> A series or Play-In game locks
              at the start time of the first game of that series/game.
            </p>
            <p className="text-sm mt-2">
              <strong>Early Finals:</strong> Locks at the start time of the first
              playoff game.
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            Once locked, you cannot edit your prediction. Locked predictions
            become visible to all users.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scoring System</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="font-semibold mb-3">Early Finals Predictions</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                <strong>5 points</strong> for each conference finalist you
                predict correctly (East champion and West champion from the
                actual Conference Finals)
              </li>
              <li>
                <strong>5 additional points</strong> if you also predict the
                NBA Finals champion correctly
              </li>
              <li>
                Maximum for this round: <strong>15 points</strong> (both
                finalists + champion right)
              </li>
              <li>
                Points are counted once the real Conference Finals and NBA Finals
                have an official winner in the pool.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Play-In Games</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>
                <strong>2 points</strong> for each correct winner prediction
              </li>
              <li>No bonus points in Play-In games</li>
              <li>0 points for incorrect predictions or missed predictions</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Playoff Series</h3>
            <p className="text-sm mb-3">
              Each round has a base point value (x). Points are awarded based
              on how accurate your prediction is:
            </p>

            <div className="space-y-4">
              <div className="border-l-4 border-primary pl-4">
                <h4 className="font-semibold mb-2">Exact Correct Prediction</h4>
                <p className="text-sm">
                  If you predict both the correct advancing team{" "}
                  <strong>and</strong> the exact final series result:
                </p>
                <p className="text-sm font-mono bg-muted p-2 rounded mt-2">
                  Score = x + 4
                </p>
              </div>

              <div className="border-l-4 border-secondary pl-4">
                <h4 className="font-semibold mb-2">
                  Correct Winner, Wrong Score
                </h4>
                <p className="text-sm">
                  If you predict the correct advancing team, but the exact
                  series score is wrong:
                </p>
                <p className="text-sm font-mono bg-muted p-2 rounded mt-2">
                  Score = x - y
                </p>
                <p className="text-sm mt-2">
                  Where <strong>y</strong> = absolute difference in the losing
                  team&apos;s win count between your prediction and the actual result.
                </p>
                <div className="text-xs text-muted-foreground mt-2 space-y-1">
                  <p>Examples:</p>
                  <ul className="list-disc list-inside ml-4">
                    <li>Predicted 4-1, actual 4-3 → y = 2</li>
                    <li>Predicted 4-2, actual 4-0 → y = 2</li>
                    <li>Predicted 4-3, actual 4-2 → y = 1</li>
                  </ul>
                </div>
              </div>

              <div className="border-l-4 border-destructive pl-4">
                <h4 className="font-semibold mb-2">Wrong Advancing Team</h4>
                <p className="text-sm">
                  If you predict the wrong advancing team:
                </p>
                <p className="text-sm font-mono bg-muted p-2 rounded mt-2">
                  Score = 0
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  (Exception: See 7-game bonus below)
                </p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Base Point Values by Round</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-xs text-muted-foreground">First Round</div>
                <div className="text-2xl font-bold">{ROUND_BASE_VALUES.first}</div>
              </div>
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-xs text-muted-foreground">Second Round</div>
                <div className="text-2xl font-bold">{ROUND_BASE_VALUES.second}</div>
              </div>
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-xs text-muted-foreground">Conference Finals</div>
                <div className="text-2xl font-bold">{ROUND_BASE_VALUES.conference}</div>
              </div>
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-xs text-muted-foreground">Finals</div>
                <div className="text-2xl font-bold">{ROUND_BASE_VALUES.finals}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bonus Points</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">
            Bonus points are added on top of the normal score calculation:
          </p>

          <div className="space-y-3">
            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-semibold">Sweep Bonus (+2 points)</h4>
              <p className="text-sm">
                If you predict a team wins 4-0 and that team actually wins in 4
                games (regardless of which team you predicted):
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Example: You predict Team A wins 4-0, and Team A actually wins
                4-0 → You get +2 bonus points on top of your normal score.
              </p>
            </div>

            <div className="border-l-4 border-primary pl-4">
              <h4 className="font-semibold">7-Game Distance Bonus (+2 points)</h4>
              <p className="text-sm">
                If you predict a team wins 4-3, but the other team actually wins
                4-3:
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Example: You predict Team A wins 4-3, but Team B actually wins
                4-3 → You get +2 bonus points even though you picked the wrong
                team.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Missed Predictions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm">
            If you do not submit a prediction before a series or game locks, you
            will receive <strong>0 points</strong> for that series/game. The
            same applies to Early Finals if you do not submit before that round
            locks.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Prediction Visibility</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm">
            <strong>Your own predictions:</strong> Always visible to you, whether
            locked or unlocked.
          </p>
          <p className="text-sm">
            <strong>Other users&apos; predictions:</strong> Only visible after they
            are locked. Unlocked predictions of other users are kept private.
          </p>
          <p className="text-sm text-muted-foreground">
            This ensures fair play and prevents copying predictions before they
            lock.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
