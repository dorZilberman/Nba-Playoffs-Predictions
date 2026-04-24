/**
 * Fetches all NBA roster players for the current ESPN season (e.g. 2025-26)
 * and writes data/minigames/nba-players-2025-26.json
 *
 * Each player includes: photoUrl, height, nationality, division, age.
 * Draft year is not exposed on this roster endpoint (use a separate source if needed).
 *
 * Run: node scripts/fetch-hangman-nba-players.mjs (Node 18+)
 * Or:  python3 scripts/fetch_hangman_nba_players.py
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

/** ESPN team abbreviations sometimes differ from the NBA / internal keys above. */
const TEAM_ABBR_ALIASES = {
  NY: "NYK",
  GS: "GSW",
  UTAH: "UTA",
  NO: "NOP",
  SA: "SAS",
  WSH: "WAS",
}

function normalizeTeamAbbr(abbr) {
  if (abbr == null || typeof abbr !== "string") return abbr
  const u = abbr.trim().toUpperCase()
  return TEAM_ABBR_ALIASES[u] ?? u
}

/** NBA division for each franchise (current alignment). */
const TEAM_DIVISION = {
  ATL: "Southeast",
  BOS: "Atlantic",
  BKN: "Atlantic",
  CHA: "Southeast",
  CHI: "Central",
  CLE: "Central",
  DAL: "Southwest",
  DEN: "Northwest",
  DET: "Central",
  GSW: "Pacific",
  HOU: "Southwest",
  IND: "Central",
  LAC: "Pacific",
  LAL: "Pacific",
  MEM: "Southwest",
  MIA: "Southeast",
  MIL: "Central",
  MIN: "Northwest",
  NOP: "Southwest",
  NYK: "Atlantic",
  OKC: "Northwest",
  ORL: "Southeast",
  PHI: "Atlantic",
  PHX: "Pacific",
  POR: "Northwest",
  SAC: "Pacific",
  SAS: "Southwest",
  TOR: "Atlantic",
  UTA: "Northwest",
  WAS: "Southeast",
}

function divisionForAbbr(abbr) {
  const a = normalizeTeamAbbr(abbr)
  return TEAM_DIVISION[a] != null ? TEAM_DIVISION[a] : "Unknown"
}

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
  const a = normalizeTeamAbbr(abbr)
  return EAST.has(a) ? "East" : "West"
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
      const abbrRaw = team?.abbreviation
      const city = team?.location ?? ""
      const nickname = team?.name ?? ""
      const teamName = [city, nickname].filter(Boolean).join(" ").trim() || team?.displayName
      if (!id || !abbrRaw) continue

      const abbr = normalizeTeamAbbr(abbrRaw)
      const roster = await fetchJson(
        `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}/roster`
      )
      const athletes = roster.athletes ?? []
      const conf = conferenceForAbbr(abbr)
      const div = divisionForAbbr(abbr)

      for (const a of athletes) {
        const fullName = a.fullName || a.displayName
        if (!fullName || typeof fullName !== "string") continue
        const pos =
          a.position?.displayName ||
          a.position?.abbreviation ||
          a.position?.type ||
          "Unknown"
        const photoHref =
          typeof a.headshot?.href === "string" && a.headshot.href.length > 0
            ? a.headshot.href
            : null
        const height =
          typeof a.displayHeight === "string" && a.displayHeight.length > 0
            ? a.displayHeight
            : null
        const nationality =
          typeof a.birthPlace?.country === "string" &&
          a.birthPlace.country.length > 0
            ? a.birthPlace.country
            : null
        const age =
          typeof a.age === "number" && Number.isFinite(a.age) ? a.age : null

        const jerseyRaw = a.jersey
        const jerseyNumber =
          jerseyRaw !== undefined &&
          jerseyRaw !== null &&
          String(jerseyRaw).trim().length > 0
            ? String(jerseyRaw).trim()
            : null

        players.push({
          id: `espn-${a.id}`,
          displayName: fullName.trim(),
          team: teamName,
          teamAbbr: abbr,
          conference: conf,
          division: div,
          position: String(pos),
          photoUrl: photoHref,
          height,
          nationality,
          age,
          jerseyNumber,
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
