/** Canonical NBA team rows for seeding DB and backfilling `primaryColor`. */

export type NbaConference = "east" | "west"

export type NbaTeamSeed = {
  name: string
  conference: NbaConference
  logoUrl: string
  primaryColor: string
}

export const NBA_TEAMS_SEED: NbaTeamSeed[] = [
  { name: "Atlanta Hawks", conference: "east", logoUrl: "https://cdn.nba.com/logos/nba/1610612737/primary/L/logo.svg", primaryColor: "#E03A3E" },
  { name: "Boston Celtics", conference: "east", logoUrl: "https://cdn.nba.com/logos/nba/1610612738/primary/L/logo.svg", primaryColor: "#007A33" },
  { name: "Brooklyn Nets", conference: "east", logoUrl: "https://cdn.nba.com/logos/nba/1610612751/primary/L/logo.svg", primaryColor: "#000000" },
  { name: "Charlotte Hornets", conference: "east", logoUrl: "https://cdn.nba.com/logos/nba/1610612766/primary/L/logo.svg", primaryColor: "#00788C" },
  { name: "Chicago Bulls", conference: "east", logoUrl: "https://cdn.nba.com/logos/nba/1610612741/primary/L/logo.svg", primaryColor: "#CE1141" },
  { name: "Cleveland Cavaliers", conference: "east", logoUrl: "https://cdn.nba.com/logos/nba/1610612739/primary/L/logo.svg", primaryColor: "#860038" },
  { name: "Detroit Pistons", conference: "east", logoUrl: "https://cdn.nba.com/logos/nba/1610612765/primary/L/logo.svg", primaryColor: "#C8102E" },
  { name: "Indiana Pacers", conference: "east", logoUrl: "https://cdn.nba.com/logos/nba/1610612754/primary/L/logo.svg", primaryColor: "#002D62" },
  { name: "Miami Heat", conference: "east", logoUrl: "https://cdn.nba.com/logos/nba/1610612748/primary/L/logo.svg", primaryColor: "#98002E" },
  { name: "Milwaukee Bucks", conference: "east", logoUrl: "https://cdn.nba.com/logos/nba/1610612749/primary/L/logo.svg", primaryColor: "#00471B" },
  { name: "New York Knicks", conference: "east", logoUrl: "https://cdn.nba.com/logos/nba/1610612752/primary/L/logo.svg", primaryColor: "#006BB6" },
  { name: "Orlando Magic", conference: "east", logoUrl: "https://cdn.nba.com/logos/nba/1610612753/primary/L/logo.svg", primaryColor: "#0077C0" },
  { name: "Philadelphia 76ers", conference: "east", logoUrl: "https://cdn.nba.com/logos/nba/1610612755/primary/L/logo.svg", primaryColor: "#006BB6" },
  { name: "Toronto Raptors", conference: "east", logoUrl: "https://cdn.nba.com/logos/nba/1610612761/primary/L/logo.svg", primaryColor: "#CE1141" },
  { name: "Washington Wizards", conference: "east", logoUrl: "https://cdn.nba.com/logos/nba/1610612764/primary/L/logo.svg", primaryColor: "#002B5C" },

  { name: "Dallas Mavericks", conference: "west", logoUrl: "https://cdn.nba.com/logos/nba/1610612742/primary/L/logo.svg", primaryColor: "#00538C" },
  { name: "Denver Nuggets", conference: "west", logoUrl: "https://cdn.nba.com/logos/nba/1610612743/primary/L/logo.svg", primaryColor: "#0E2240" },
  { name: "Golden State Warriors", conference: "west", logoUrl: "https://cdn.nba.com/logos/nba/1610612744/primary/L/logo.svg", primaryColor: "#1D428A" },
  { name: "Houston Rockets", conference: "west", logoUrl: "https://cdn.nba.com/logos/nba/1610612745/primary/L/logo.svg", primaryColor: "#CE1141" },
  { name: "LA Clippers", conference: "west", logoUrl: "https://cdn.nba.com/logos/nba/1610612746/primary/L/logo.svg", primaryColor: "#C8102E" },
  { name: "Los Angeles Lakers", conference: "west", logoUrl: "https://cdn.nba.com/logos/nba/1610612747/primary/L/logo.svg", primaryColor: "#552583" },
  { name: "Memphis Grizzlies", conference: "west", logoUrl: "https://cdn.nba.com/logos/nba/1610612763/primary/L/logo.svg", primaryColor: "#5D76A9" },
  { name: "Minnesota Timberwolves", conference: "west", logoUrl: "https://cdn.nba.com/logos/nba/1610612750/primary/L/logo.svg", primaryColor: "#0C2340" },
  { name: "New Orleans Pelicans", conference: "west", logoUrl: "https://cdn.nba.com/logos/nba/1610612740/primary/L/logo.svg", primaryColor: "#0C2340" },
  { name: "Oklahoma City Thunder", conference: "west", logoUrl: "https://cdn.nba.com/logos/nba/1610612760/primary/L/logo.svg", primaryColor: "#007AC1" },
  { name: "Phoenix Suns", conference: "west", logoUrl: "https://cdn.nba.com/logos/nba/1610612756/primary/L/logo.svg", primaryColor: "#1D1160" },
  { name: "Portland Trail Blazers", conference: "west", logoUrl: "https://cdn.nba.com/logos/nba/1610612757/primary/L/logo.svg", primaryColor: "#E03A3E" },
  { name: "Sacramento Kings", conference: "west", logoUrl: "https://cdn.nba.com/logos/nba/1610612758/primary/L/logo.svg", primaryColor: "#5A2D81" },
  { name: "San Antonio Spurs", conference: "west", logoUrl: "https://cdn.nba.com/logos/nba/1610612759/primary/L/logo.svg", primaryColor: "#000000" },
  { name: "Utah Jazz", conference: "west", logoUrl: "https://cdn.nba.com/logos/nba/1610612762/primary/L/logo.svg", primaryColor: "#002B5C" },
]
