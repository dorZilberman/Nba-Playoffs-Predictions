"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent } from "@/components/ui/card"
import { LockCountdown } from "@/components/bracket/LockCountdown"
import { BracketTeamBox } from "@/components/bracket/BracketTeamBox"
import { formatToIST } from "@/app/lib/utils/timezone"
import { cn } from "@/app/lib/utils/cn"
import { Lock } from "lucide-react"
import type { ISeries } from "@/app/lib/models/Series"
import {
  calculateEarlyFinalsScore,
  resolveFinalsOutcomesFromSeries,
} from "@/app/lib/scoring/earlyFinals"
import {
  USER_NOT_IN_DB_CODE,
  USER_NOT_IN_DB_MESSAGE,
} from "@/app/lib/userNotInDbConstants"

function formatPointsLabel(n: number): string {
  return n === 1 ? "1 point" : `${n} points`
}

type TeamOption = { name: string; logoUrl: string }

interface EarlyFinalsApiResponse {
  seasonId: string | null
  playoffsStartTime: string | null
  locked: boolean
  eastTeams: TeamOption[]
  westTeams: TeamOption[]
  prediction: {
    eastFinalist: string
    westFinalist: string
    nbaChampion: string
  } | null
  canEdit: boolean
}

interface EarlyFinalsPredictionsSectionProps {
  /** Playoff series (for resolving actual conference / NBA champs for scoring). */
  series?: ISeries[]
  viewingUserId?: string
  isViewingOtherUser?: boolean
  viewingUserName?: string
  /** Called after a successful save (e.g. refresh To Do on bracket). */
  onPredictionSaved?: () => void
}

/** Same footprint as MatchupBox in PlayoffBracketVisual */
const BRACKET_MATCHUP_WIDTH =
  "w-[160px] md:w-[200px] shrink-0 max-w-none"

function DashedTbdRow() {
  return (
    <Card className="h-10 md:h-12 flex items-center justify-between px-2 border-2 border-dashed border-border">
      <CardContent className="p-0 flex items-center gap-1.5 md:gap-2 w-full">
        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-muted flex items-center justify-center text-[10px] md:text-xs font-bold shrink-0">
          ?
        </div>
        <div className="flex-1 font-medium text-[10px] md:text-xs truncate text-muted-foreground">
          TBD
        </div>
      </CardContent>
    </Card>
  )
}

function ConferenceChampionSlot({
  selectedTeam,
  roundLocked,
  canEditSlot,
  picksHiddenFromViewer,
  onOpenPicker,
  /** Actual conference winner from the bracket (when decided); drives yellow ✓ / wrong X */
  actualConferenceWinner,
}: {
  selectedTeam: string | null
  roundLocked: boolean
  canEditSlot: boolean
  /** Another user's picks before lock — TBD + big lock like unset MatchupBox */
  picksHiddenFromViewer: boolean
  onOpenPicker: () => void
  actualConferenceWinner?: string | null
}) {
  const hasPick = !!selectedTeam
  const showBigLock = picksHiddenFromViewer
  const showSmallLock = !picksHiddenFromViewer && roundLocked
  const canClick = canEditSlot && !roundLocked && !hasPick
  const canChangePick = canEditSlot && !roundLocked && hasPick

  const handleRootClick = () => {
    if (canClick || canChangePick) onOpenPicker()
  }

  return (
    <div
      className={cn(
        "relative flex flex-col gap-1",
        BRACKET_MATCHUP_WIDTH,
        (canClick || canChangePick) &&
          "cursor-pointer hover:opacity-80 transition-opacity"
      )}
      onClick={canClick || canChangePick ? handleRootClick : undefined}
      role={canClick || canChangePick ? "button" : undefined}
      tabIndex={canClick || canChangePick ? 0 : undefined}
      onKeyDown={
        canClick || canChangePick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                onOpenPicker()
              }
            }
          : undefined
      }
    >
      <div className={showBigLock ? "opacity-40" : ""}>
        {selectedTeam ? (
          <BracketTeamBox
            team={selectedTeam}
            isWinner={
              !!actualConferenceWinner &&
              selectedTeam === actualConferenceWinner
            }
            wins={0}
            hasScore={false}
            hasPrediction={!!selectedTeam}
            actualWinner={actualConferenceWinner ?? undefined}
          />
        ) : (
          <DashedTbdRow />
        )}
        {showSmallLock && (
          <div className="text-center mt-1 flex items-center justify-center gap-1">
            <Lock className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
      </div>
      {showBigLock && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <Lock className="h-8 w-8 md:h-10 md:h-10 text-foreground drop-shadow-lg" />
        </div>
      )}
    </div>
  )
}

function EarlyFinalsChampionSlot({
  westTeam,
  eastTeam,
  champion,
  roundLocked,
  canEditSlot,
  picksHiddenFromViewer,
  onSelectChampion,
  /** Actual NBA champion from the finals series (when decided) */
  actualNbaChampion,
}: {
  westTeam: string | null
  eastTeam: string | null
  champion: string | null
  roundLocked: boolean
  canEditSlot: boolean
  picksHiddenFromViewer: boolean
  onSelectChampion: (name: string) => void
  actualNbaChampion?: string | null
}) {
  const both = !!(westTeam && eastTeam)
  const showBigLock = picksHiddenFromViewer
  const showSmallLock = !picksHiddenFromViewer && roundLocked
  const canPick =
    canEditSlot && !roundLocked && both && !!(westTeam && eastTeam)

  const rowClick = (name: string) => {
    if (canPick) onSelectChampion(name)
  }

  return (
    <div className={cn("relative flex flex-col gap-1", BRACKET_MATCHUP_WIDTH)}>
      <div className={showBigLock ? "opacity-40" : ""}>
        {both && westTeam && eastTeam ? (
          <>
            <div
              className={cn(canPick && "cursor-pointer hover:opacity-80 transition-opacity")}
              onClick={() => rowClick(westTeam)}
              onKeyDown={
                canPick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        rowClick(westTeam)
                      }
                    }
                  : undefined
              }
              role={canPick ? "button" : undefined}
              tabIndex={canPick ? 0 : undefined}
            >
              <BracketTeamBox
                team={westTeam}
                isWinner={
                  !!actualNbaChampion && westTeam === actualNbaChampion
                }
                wins={0}
                hasScore={false}
                hasPrediction={champion === westTeam}
                actualWinner={actualNbaChampion ?? undefined}
              />
            </div>
            <div className="text-center text-[8px] md:text-[9px] text-muted-foreground">
              vs
            </div>
            <div
              className={cn(canPick && "cursor-pointer hover:opacity-80 transition-opacity")}
              onClick={() => rowClick(eastTeam)}
              onKeyDown={
                canPick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        rowClick(eastTeam)
                      }
                    }
                  : undefined
              }
              role={canPick ? "button" : undefined}
              tabIndex={canPick ? 0 : undefined}
            >
              <BracketTeamBox
                team={eastTeam}
                isWinner={
                  !!actualNbaChampion && eastTeam === actualNbaChampion
                }
                wins={0}
                hasScore={false}
                hasPrediction={champion === eastTeam}
                actualWinner={actualNbaChampion ?? undefined}
              />
            </div>
          </>
        ) : (
          <>
            <DashedTbdRow />
            <div className="text-center text-[8px] md:text-[9px] text-muted-foreground">
              vs
            </div>
            <DashedTbdRow />
          </>
        )}
        {showSmallLock && (
          <div className="text-center mt-1 flex items-center justify-center gap-1">
            <Lock className="h-3 w-3 text-muted-foreground" />
          </div>
        )}
      </div>
      {showBigLock && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
          <Lock className="h-8 w-8 md:h-10 md:h-10 text-foreground drop-shadow-lg" />
        </div>
      )}
    </div>
  )
}

function ColumnChrome({
  heading,
  headingTone = "muted",
  children,
}: {
  heading: string
  headingTone?: "muted" | "finals"
  children: ReactNode
}) {
  return (
    <div className="flex flex-col justify-center items-center max-w-[220px] shrink-0 w-full md:w-auto">
      <div className="text-center mb-3 px-1 w-full">
        <h3
          className={cn(
            "font-bold leading-tight text-balance",
            headingTone === "finals"
              ? "text-xs md:text-sm text-muted-foreground"
              : "text-[10px] md:text-xs text-foreground"
          )}
        >
          {heading}
        </h3>
      </div>
      {children}
    </div>
  )
}

export function EarlyFinalsPredictionsSection({
  series = [],
  viewingUserId,
  isViewingOtherUser = false,
  viewingUserName = "User",
  onPredictionSaved,
}: EarlyFinalsPredictionsSectionProps) {
  const [data, setData] = useState<EarlyFinalsApiResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [picker, setPicker] = useState<"east" | "west" | null>(null)

  const [east, setEast] = useState<string>("")
  const [west, setWest] = useState<string>("")
  const [champion, setChampion] = useState<string>("")

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q =
        viewingUserId && isViewingOtherUser
          ? `?userId=${encodeURIComponent(viewingUserId)}`
          : ""
      const res = await fetch(`/api/early-finals${q}`)
      if (res.status === 403) {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string
          code?: string
        }
        if (body.code === USER_NOT_IN_DB_CODE) {
          setError(
            typeof body.error === "string" ? body.error : USER_NOT_IN_DB_MESSAGE
          )
        } else {
          setError("Could not load early finals data.")
        }
        setData(null)
        return
      }
      if (!res.ok) {
        throw new Error("Failed to load")
      }
      const json: EarlyFinalsApiResponse = await res.json()
      setData(json)
      if (json.prediction) {
        setEast(json.prediction.eastFinalist)
        setWest(json.prediction.westFinalist)
        setChampion(json.prediction.nbaChampion)
      } else {
        setEast("")
        setWest("")
        setChampion("")
      }
    } catch {
      setError("Could not load early finals data.")
    } finally {
      setLoading(false)
    }
  }, [viewingUserId, isViewingOtherUser])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    if (
      champion &&
      champion !== east &&
      champion !== west
    ) {
      setChampion("")
    }
  }, [east, west, champion])

  const resolvedOutcomes = useMemo(
    () =>
      resolveFinalsOutcomesFromSeries(
        series.map((s) => ({
          round: s.round,
          conference: s.conference,
          winner: s.winner,
        }))
      ),
    [series]
  )

  const earlyFinalsPointsTotal = useMemo(
    () => calculateEarlyFinalsScore(data?.prediction ?? null, resolvedOutcomes),
    [data?.prediction, resolvedOutcomes]
  )

  const handleSave = async () => {
    if (!east || !west || !champion) {
      setError("Choose East, West, and NBA champion.")
      return
    }
    if (champion !== east && champion !== west) {
      setError("Champion must be one of your conference picks.")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/early-finals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eastFinalist: east,
          westFinalist: west,
          nbaChampion: champion,
        }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(body.error || "Save failed")
      }
      await fetchData()
      onPredictionSaved?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed")
    } finally {
      setSaving(false)
    }
  }

  if (!loading && error != null && data == null) {
    return (
      <div
        className="rounded-lg border border-destructive/60 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        role="alert"
      >
        {error}
      </div>
    )
  }

  if (loading || !data) {
    return (
      <div className="text-sm text-muted-foreground py-4">
        Loading early finals…
      </div>
    )
  }

  if (!data.seasonId) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No active season. Early Finals predictions are not available yet.
      </p>
    )
  }

  const teamsReady = data.eastTeams.length > 0 && data.westTeams.length > 0

  const editable =
    data.canEdit && !data.locked && !isViewingOtherUser && teamsReady

  const readOnlyPrediction = !!data.prediction && !editable
  const eastVal = readOnlyPrediction
    ? data.prediction!.eastFinalist
    : east
  const westVal = readOnlyPrediction
    ? data.prediction!.westFinalist
    : west
  const championVal = readOnlyPrediction
    ? data.prediction!.nbaChampion
    : champion

  const roundLocked = data.locked

  const pickerTeams = picker === "east" ? data.eastTeams : data.westTeams

  const canSave =
    editable && !!east && !!west && !!champion && !saving

  const picksHiddenFromViewer =
    isViewingOtherUser && !data.locked && teamsReady

  const showBracketStrip =
    teamsReady &&
    (editable ||
      data.prediction ||
      data.locked ||
      picksHiddenFromViewer)

  /** Top banner already says "No prediction submitted" when viewing another user, locked, no picks. */
  const viewingOtherLockedNoPicks =
    isViewingOtherUser && data.locked && !data.prediction

  const showEarlyFinalsPointsRow =
    roundLocked &&
    !picksHiddenFromViewer &&
    teamsReady &&
    showBracketStrip &&
    !viewingOtherLockedNoPicks

  return (
    <div className="space-y-6">
      {data.playoffsStartTime && !data.locked && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            Prediction Deadline at: {formatToIST(data.playoffsStartTime)}
          </div>
          <LockCountdown lockAt={data.playoffsStartTime} hide={false} />
        </div>
      )}

      {!data.playoffsStartTime && (
        <p className="text-xs text-muted-foreground">
          An admin will set a lock deadline for this round. You can edit your
          picks until then.
        </p>
      )}

      {isViewingOtherUser && data.locked && (
        <div className="text-center text-sm text-muted-foreground space-y-1">
          {data.prediction ? (
            <p>Viewing {viewingUserName}&apos;s early finals picks.</p>
          ) : (
            <p className="inline-flex flex-wrap items-center justify-center gap-1">
              <span>
                No prediction submitted ({formatPointsLabel(0)})
              </span>
              <Lock className="h-3.5 w-3.5 shrink-0" />
            </p>
          )}
        </div>
      )}

      {!teamsReady && (
        <p className="text-sm text-muted-foreground">
          Teams are not seeded yet. An admin must add teams before you can submit
          Early Finals picks.
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {showBracketStrip && (
        <div
          className={cn(
            "grid w-full max-w-lg mx-auto grid-cols-2 gap-x-3 gap-y-6 justify-items-center",
            "md:max-w-none md:mx-0 md:flex md:flex-row md:flex-nowrap md:justify-center md:items-center md:gap-4 lg:gap-8"
          )}
        >
          <div className="min-w-0 flex justify-center w-full md:w-auto md:order-1">
            <ColumnChrome heading="Western Conference Champions">
              <ConferenceChampionSlot
                selectedTeam={
                  picksHiddenFromViewer
                    ? null
                    : editable
                      ? west || null
                      : westVal || null
                }
                roundLocked={roundLocked}
                canEditSlot={editable}
                picksHiddenFromViewer={picksHiddenFromViewer}
                onOpenPicker={() => setPicker("west")}
                actualConferenceWinner={resolvedOutcomes.westConferenceWinner}
              />
            </ColumnChrome>
          </div>

          <div className="min-w-0 flex justify-center w-full md:w-auto md:order-3">
            <ColumnChrome heading="Eastern Conference Champions">
              <ConferenceChampionSlot
                selectedTeam={
                  picksHiddenFromViewer
                    ? null
                    : editable
                      ? east || null
                      : eastVal || null
                }
                roundLocked={roundLocked}
                canEditSlot={editable}
                picksHiddenFromViewer={picksHiddenFromViewer}
                onOpenPicker={() => setPicker("east")}
                actualConferenceWinner={resolvedOutcomes.eastConferenceWinner}
              />
            </ColumnChrome>
          </div>

          <div className="col-span-2 flex justify-center w-full md:col-span-1 md:order-2 md:w-auto">
            <ColumnChrome heading="NBA FINALS" headingTone="finals">
              <div className="relative flex justify-center min-h-[1rem]">
                <EarlyFinalsChampionSlot
                  westTeam={
                    picksHiddenFromViewer
                      ? null
                      : editable
                        ? west || null
                        : westVal || null
                  }
                  eastTeam={
                    picksHiddenFromViewer
                      ? null
                      : editable
                        ? east || null
                        : eastVal || null
                  }
                  champion={
                    picksHiddenFromViewer
                      ? null
                      : editable
                        ? champion || null
                        : championVal || null
                  }
                  roundLocked={roundLocked}
                  canEditSlot={editable}
                  picksHiddenFromViewer={picksHiddenFromViewer}
                  onSelectChampion={setChampion}
                  actualNbaChampion={resolvedOutcomes.nbaChampion}
                />
              </div>
            </ColumnChrome>
          </div>
        </div>
      )}

      {showEarlyFinalsPointsRow && (
        <div className="text-center text-[8px] md:text-[9px] text-muted-foreground font-medium mt-2">
          {data.prediction ? (
            <span>
              Points from early finals ({formatPointsLabel(earlyFinalsPointsTotal)})
            </span>
          ) : (
            <span>
              No prediction submitted ({formatPointsLabel(0)})
            </span>
          )}
        </div>
      )}

      {editable && (
        <div className="flex justify-center">
          <Button onClick={handleSave} disabled={!canSave}>
            {saving ? "Saving…" : "Save picks"}
          </Button>
        </div>
      )}

      <Dialog open={picker !== null} onOpenChange={(o) => !o && setPicker(null)}>
        <DialogContent className="max-w-md max-h-[min(90vh,720px)] flex flex-col gap-0 overflow-hidden p-0 pt-6 sm:rounded-lg">
          <div className="shrink-0 px-6 pb-3 pr-14">
            <DialogHeader>
              <DialogTitle>
                {picker === "west"
                  ? "Pick Western Conference champion"
                  : "Pick Eastern Conference champion"}
              </DialogTitle>
            </DialogHeader>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-6 pt-1 sm:px-5 [scrollbar-gutter:stable]">
            <div className="flex flex-col gap-2.5 py-1">
              {pickerTeams.map((t) => (
                <button
                  key={t.name}
                  type="button"
                  className="w-full text-left rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring focus-visible:ring-offset-0"
                  onClick={() => {
                    if (picker === "west") setWest(t.name)
                    else setEast(t.name)
                    setPicker(null)
                  }}
                >
                  <BracketTeamBox
                    team={t.name}
                    isWinner={false}
                    wins={0}
                    hasScore={false}
                    hasPrediction={false}
                    actualWinner={undefined}
                  />
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
