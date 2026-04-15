/**
 * Competition ranking by totalScore (high to low): tied totals share the same 1-based rank
 * (e.g. 1, 1, 3). Uses the same filtered row set the table shows (e.g. all vs paid only).
 */
export function rankByTotalScoreMap(
  rows: { userId: string; totalScore: number }[]
): Map<string, number> {
  const sorted = [...rows].sort((a, b) => b.totalScore - a.totalScore)
  const out = new Map<string, number>()
  let rank = 1
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i].totalScore !== sorted[i - 1].totalScore) {
      rank = i + 1
    }
    out.set(sorted[i].userId, rank)
  }
  return out
}
