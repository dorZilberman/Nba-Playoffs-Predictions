import { requireAuth } from "@/app/lib/utils/auth"
import { StandingsTable } from "@/components/standings/StandingsTable"

export default async function StandingsPage() {
  await requireAuth()

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Standings</h1>
      <StandingsTable />
    </div>
  )
}
