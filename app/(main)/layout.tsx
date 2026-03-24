import { Nav } from "@/components/nav"
import { requireAuth } from "@/app/lib/utils/auth"
import { getSeasonNavGateFlags } from "@/app/lib/season/navFlags"

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth()
  const { showWhatIf, showAnalytics } = await getSeasonNavGateFlags()

  return (
    <div className="min-h-screen bg-background">
      <Nav showWhatIf={showWhatIf} showAnalytics={showAnalytics} />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
