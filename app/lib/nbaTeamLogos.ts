import { NBA_TEAMS_SEED } from "@/app/lib/nbaTeamsSeedData"

const LOGO_BY_FULL_NAME = new Map(
  NBA_TEAMS_SEED.map((t) => [t.name, t.logoUrl])
)

/** Resolve NBA.com logo URL from canonical full team name (matches roster `team` field). */
export function getNbaTeamLogoUrlByFullName(
  fullName: string
): string | undefined {
  return LOGO_BY_FULL_NAME.get(fullName)
}
