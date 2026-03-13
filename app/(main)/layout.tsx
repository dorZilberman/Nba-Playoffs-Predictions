import { Nav } from "@/components/nav"
import { requireAuth } from "@/app/lib/utils/auth"

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth()

  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  )
}
