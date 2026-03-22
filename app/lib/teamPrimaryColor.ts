const FALLBACK_COLORS = [
  "hsl(var(--primary))",
  "hsl(221.2 83.2% 53.3%)",
  "hsl(142.1 76.2% 36.3%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 60%)",
  "hsl(340 75% 55%)",
  "hsl(199 89% 48%)",
  "hsl(24 95% 53%)",
]

const HEX_PRIMARY = /^#[0-9A-Fa-f]{6}$/

export type TeamColorLookup = (name: string) => { primaryColor?: string } | null

/** Team DB primary hex, or a fallback palette index (charts + list bars). */
export function teamPrimaryColorOrFallback(
  teamName: string,
  getTeamByName: TeamColorLookup,
  fallbackIndex: number
): string {
  const hex = getTeamByName(teamName)?.primaryColor
  if (hex && HEX_PRIMARY.test(hex)) return hex
  return FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length]
}
