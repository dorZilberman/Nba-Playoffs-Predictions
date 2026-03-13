import { requireAuth } from "@/app/lib/utils/auth"
import { BracketPageClient } from "@/components/bracket/BracketPageClient"

export default async function BracketPage() {
  await requireAuth()

  return <BracketPageClient />
}
