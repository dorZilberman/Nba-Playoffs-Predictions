/**
 * Fetches all NBA roster players for the current ESPN season (e.g. 2025-26)
 * and writes data/minigames/nba-players-2025-26.json
 *
 * Run: node scripts/fetch-hangman-nba-players.mjs
 * Requires: network
 */
import { writeFileSync, mkdirSync } from "fs"
import { dirname, join } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, "..", "data", "minigames", "nba-players-2025-26.json")

const EAST = new Set([
  "ATL",
  "BOS",
  "BKN",
  "CHA",
  "CHI",
  "CLE",
  "DET",
  "IND",
  "MIA",
  "MIL",
  "NYK",
  "ORL",
  "PHI",
  "TOR",
  "WAS",
])

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
  })
  if (!res.ok) throw new Error(`${url} -> ${res.status}`)
  return res.json()
}

function conferenceForAbbr(abbr) {
  return EAST.has(abbr) ? "East" : "West"
}

function main() {
  return (async () => {
    const teamsData = await fetchJson(
      "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=100"
    )
    const teams = teamsData.sports?.[0]?.leagues?.[0]?.teams ?? []
    const players = []

    for (const { team } of teams) {
      const id = team?.id
      const abbr = team?.abbreviation
      const city = team?.location ?? ""
      const nickname = team?.name ?? ""
      const teamName = [city, nickname].filter(Boolean).join(" ").trim() || team?.displayName
      if (!id || !abbr) continue

      const roster = await fetchJson(
        `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}/roster`
      )
      const athletes = roster.athletes ?? []
      const conf = conferenceForAbbr(abbr)

      for (const a of athletes) {
        const fullName = a.fullName || a.displayName
        if (!fullName || typeof fullName !== "string") continue
        const pos =
          a.position?.displayName ||
          a.position?.abbreviation ||
          a.position?.type ||
          "Unknown"
        players.push({
          id: `espn-${a.id}`,
          displayName: fullName.trim(),
          team: teamName,
          teamAbbr: abbr,
          conference: conf,
          position: String(pos),
        })
      }
    }

    const byName = new Map()
    for (const p of players) {
      const key = p.displayName.toLowerCase()
      if (!byName.has(key)) byName.set(key, p)
    }
    const unique = [...byName.values()]

    mkdirSync(dirname(OUT), { recursive: true })
    writeFileSync(
      OUT,
      JSON.stringify(
        {
          seasonLabel: "2025-26",
          source: "ESPN roster API (run scripts/fetch-hangman-nba-players.mjs)",
          updatedAt: new Date().toISOString(),
          players: unique,
        },
        null,
        2
      ),
      "utf8"
    )
    console.log(`Wrote ${unique.length} players to ${OUT}`)
  })()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
