import type { HangmanPlayerBundle } from "@/app/lib/minigames/types"

export type NbaTeamOption = {
  abbr: string
  label: string
}

/** Build sorted team list (abbr + full name) from the hangman roster bundle. */
export function buildNbaTeamOptionsFromBundle(
  bundle: HangmanPlayerBundle
): NbaTeamOption[] {
  const map = new Map<string, string>()
  for (const p of bundle.players) {
    if (!map.has(p.teamAbbr)) {
      map.set(p.teamAbbr, p.team)
    }
  }
  return Array.from(map.entries())
    .map(([abbr, label]) => ({ abbr, label }))
    .sort((a, b) => a.label.localeCompare(b.label, "en"))
}
