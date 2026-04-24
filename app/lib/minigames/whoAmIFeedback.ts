import type { HangmanPlayer } from "@/app/lib/minigames/types"

export const WHO_AM_I_MAX_GUESSES = 8

export type WhoAmIColumnKey =
  | "team"
  | "conference"
  | "division"
  | "position"
  | "height"
  | "age"
  | "jerseyNumber"
  | "nationality"

export type WhoAmICellState = "correct" | "close" | "wrong"

export type WhoAmICellFeedback = {
  state: WhoAmICellState
  /** For height / age / jersey: direction of the answer vs this guess when `close` or `wrong`. */
  dir?: "higher" | "lower"
}

export type WhoAmIFeedbackRow = Record<WhoAmIColumnKey, WhoAmICellFeedback>

export type WhoAmIGuessRowPayload = {
  guessedPlayerId: string
  guessedName: string
  /** Values shown in the grid for this guess. */
  display: Record<WhoAmIColumnKey, string>
  feedback: WhoAmIFeedbackRow
}

export type WhoAmIClientRound = {
  guessRows: WhoAmIGuessRowPayload[]
  photoHintUsed: boolean
  guessesUsed: number
  maxGuesses: number
  status: "playing" | "won" | "lost"
  photoHintUrl: string | null
  answerPlayer: {
    id: string
    displayName: string
    photoUrl: string | null
  } | null
}

export function heightToInches(height: string | null): number | null {
  if (!height) return null
  const m = height.trim().match(/^(\d+)'\s*(\d+)?/)
  if (!m) return null
  const ft = Number(m[1])
  const inch = m[2] != null && m[2] !== "" ? Number(m[2]) : 0
  if (!Number.isFinite(ft) || !Number.isFinite(inch)) return null
  return ft * 12 + inch
}

function parseJerseyNumber(j: string | null): number | null {
  if (j == null || j.trim() === "") return null
  const n = Number.parseInt(j.replace(/^0+/, "") || "0", 10)
  return Number.isFinite(n) ? n : null
}

function positionTokenSet(s: string): Set<string> {
  const x = s.toLowerCase()
  const set = new Set<string>()
  if (x.includes("guard")) set.add("G")
  if (x.includes("forward")) set.add("F")
  if (x.includes("center")) set.add("C")
  return set
}

function fmtAge(a: number | null): string {
  return a == null ? "—" : String(a)
}

function fmtJersey(j: string | null): string {
  return j == null || j.trim() === "" ? "—" : j
}

function fmtNat(n: string | null): string {
  return n?.trim() ? n.trim() : "—"
}

function fmtHeight(h: string | null): string {
  return h?.trim() ? h.trim() : "—"
}

export function computeWhoAmIFeedback(
  secret: HangmanPlayer,
  guess: HangmanPlayer
): WhoAmIGuessRowPayload {
  const display: Record<WhoAmIColumnKey, string> = {
    team: guess.team,
    conference: guess.conference,
    division: guess.division,
    position: guess.position,
    height: fmtHeight(guess.height),
    age: fmtAge(guess.age),
    jerseyNumber: fmtJersey(guess.jerseyNumber),
    nationality: fmtNat(guess.nationality),
  }

  const feedback = {} as WhoAmIFeedbackRow

  // Team — only exact match (green) or miss (gray); no “same conference” hint here.
  feedback.team =
    guess.team === secret.team ? { state: "correct" } : { state: "wrong" }

  // Conference
  feedback.conference =
    guess.conference === secret.conference
      ? { state: "correct" }
      : { state: "wrong" }

  // Division — same as team: exact division only, no partial / same-conference yellow.
  feedback.division =
    guess.division === secret.division ? { state: "correct" } : { state: "wrong" }

  // Position
  const gPos = guess.position.trim()
  const sPos = secret.position.trim()
  if (gPos.toLowerCase() === sPos.toLowerCase()) {
    feedback.position = { state: "correct" }
  } else {
    const gT = positionTokenSet(guess.position)
    const sT = positionTokenSet(secret.position)
    let overlap = false
    for (const t of gT) {
      if (sT.has(t)) {
        overlap = true
        break
      }
    }
    feedback.position = overlap ? { state: "close" } : { state: "wrong" }
  }

  const sIn = heightToInches(secret.height)
  const gIn = heightToInches(guess.height)
  if (sIn != null && gIn != null) {
    if (gIn === sIn) {
      feedback.height = { state: "correct" }
    } else {
      const d = Math.abs(gIn - sIn)
      if (d <= 2) {
        feedback.height = {
          state: "close",
          dir: sIn > gIn ? "higher" : "lower",
        }
      } else {
        feedback.height = {
          state: "wrong",
          dir: sIn > gIn ? "higher" : "lower",
        }
      }
    }
  } else {
    feedback.height = { state: "wrong" }
  }

  const sAge = secret.age
  const gAge = guess.age
  if (sAge != null && gAge != null) {
    if (gAge === sAge) {
      feedback.age = { state: "correct" }
    } else {
      const d = Math.abs(gAge - sAge)
      if (d <= 2) {
        feedback.age = {
          state: "close",
          dir: sAge > gAge ? "higher" : "lower",
        }
      } else {
        feedback.age = {
          state: "wrong",
          dir: sAge > gAge ? "higher" : "lower",
        }
      }
    }
  } else {
    feedback.age = { state: "wrong" }
  }

  const sJ = parseJerseyNumber(secret.jerseyNumber)
  const gJ = parseJerseyNumber(guess.jerseyNumber)
  if (sJ != null && gJ != null) {
    if (gJ === sJ) {
      feedback.jerseyNumber = { state: "correct" }
    } else {
      const d = Math.abs(gJ - sJ)
      if (d <= 2) {
        feedback.jerseyNumber = {
          state: "close",
          dir: sJ > gJ ? "higher" : "lower",
        }
      } else {
        feedback.jerseyNumber = {
          state: "wrong",
          dir: sJ > gJ ? "higher" : "lower",
        }
      }
    }
  } else {
    feedback.jerseyNumber = { state: "wrong" }
  }

  const sNat = (secret.nationality ?? "").trim().toLowerCase()
  const gNat = (guess.nationality ?? "").trim().toLowerCase()
  if (sNat && gNat && sNat === gNat) {
    feedback.nationality = { state: "correct" }
  } else {
    feedback.nationality = { state: "wrong" }
  }

  return {
    guessedPlayerId: guess.id,
    guessedName: guess.displayName,
    display,
    feedback,
  }
}
