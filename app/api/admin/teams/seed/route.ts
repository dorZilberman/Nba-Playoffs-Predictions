import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/app/lib/utils/auth"
import dbConnect from "@/app/lib/db"
import Team from "@/app/lib/models/Team"

// NBA teams with their logos from a CDN
const NBA_TEAMS = [
  // Eastern Conference
  { name: "Atlanta Hawks", conference: "east" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612737/primary/L/logo.svg" },
  { name: "Boston Celtics", conference: "east" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612738/primary/L/logo.svg" },
  { name: "Brooklyn Nets", conference: "east" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612751/primary/L/logo.svg" },
  { name: "Charlotte Hornets", conference: "east" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612766/primary/L/logo.svg" },
  { name: "Chicago Bulls", conference: "east" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612741/primary/L/logo.svg" },
  { name: "Cleveland Cavaliers", conference: "east" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612739/primary/L/logo.svg" },
  { name: "Detroit Pistons", conference: "east" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612765/primary/L/logo.svg" },
  { name: "Indiana Pacers", conference: "east" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612754/primary/L/logo.svg" },
  { name: "Miami Heat", conference: "east" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612748/primary/L/logo.svg" },
  { name: "Milwaukee Bucks", conference: "east" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612749/primary/L/logo.svg" },
  { name: "New York Knicks", conference: "east" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612752/primary/L/logo.svg" },
  { name: "Orlando Magic", conference: "east" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612753/primary/L/logo.svg" },
  { name: "Philadelphia 76ers", conference: "east" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612755/primary/L/logo.svg" },
  { name: "Toronto Raptors", conference: "east" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612761/primary/L/logo.svg" },
  { name: "Washington Wizards", conference: "east" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612764/primary/L/logo.svg" },
  
  // Western Conference
  { name: "Dallas Mavericks", conference: "west" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612742/primary/L/logo.svg" },
  { name: "Denver Nuggets", conference: "west" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612743/primary/L/logo.svg" },
  { name: "Golden State Warriors", conference: "west" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612744/primary/L/logo.svg" },
  { name: "Houston Rockets", conference: "west" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612745/primary/L/logo.svg" },
  { name: "LA Clippers", conference: "west" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612746/primary/L/logo.svg" },
  { name: "Los Angeles Lakers", conference: "west" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612747/primary/L/logo.svg" },
  { name: "Memphis Grizzlies", conference: "west" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612763/primary/L/logo.svg" },
  { name: "Minnesota Timberwolves", conference: "west" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612750/primary/L/logo.svg" },
  { name: "New Orleans Pelicans", conference: "west" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612740/primary/L/logo.svg" },
  { name: "Oklahoma City Thunder", conference: "west" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612760/primary/L/logo.svg" },
  { name: "Phoenix Suns", conference: "west" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612756/primary/L/logo.svg" },
  { name: "Portland Trail Blazers", conference: "west" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612757/primary/L/logo.svg" },
  { name: "Sacramento Kings", conference: "west" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612758/primary/L/logo.svg" },
  { name: "San Antonio Spurs", conference: "west" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612759/primary/L/logo.svg" },
  { name: "Utah Jazz", conference: "west" as const, logoUrl: "https://cdn.nba.com/logos/nba/1610612762/primary/L/logo.svg" },
]

export async function POST(request: NextRequest) {
  try {
    await requireAdmin()
    await dbConnect()

    // Clear existing teams
    await Team.deleteMany({})

    // Insert all teams
    const teams = await Team.insertMany(NBA_TEAMS)

    return NextResponse.json({
      message: `Successfully seeded ${teams.length} teams`,
      teams,
    })
  } catch (error) {
    console.error("Error seeding teams:", error)
    return NextResponse.json(
      { error: "Failed to seed teams" },
      { status: 500 }
    )
  }
}
