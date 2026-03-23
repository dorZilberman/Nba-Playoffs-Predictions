import { requireAdmin } from "@/app/lib/utils/auth"
import { AdminBracketView } from "@/components/admin/AdminBracketView"
import { AdminUsersPayment } from "@/components/admin/AdminUsersPayment"
import { EarlyFinalsDeadlineAdmin } from "@/components/admin/EarlyFinalsDeadlineAdmin"
import dbConnect from "@/app/lib/db"
import Season from "@/app/lib/models/Season"

export default async function AdminPage() {
  await requireAdmin()
  await dbConnect()

  let season = await Season.findOne({ isActive: true })
  if (!season) {
    // Create 2026 season if it doesn't exist
    season = await Season.create({ year: 2026, isActive: true })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Panel</h1>
      
      <EarlyFinalsDeadlineAdmin />

      <AdminUsersPayment />

      {/* Bracket View */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold">Bracket Management</h2>
        <p className="text-sm text-muted-foreground">
          Click on any Play-In game or playoff series to edit teams, scores, and deadline
        </p>
        <AdminBracketView />
      </div>
    </div>
  )
}

