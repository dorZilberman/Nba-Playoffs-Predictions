import type { Metadata } from "next"
import { ShamingClient } from "@/components/shaming/ShamingClient"

export const metadata: Metadata = {
  title: "Shaming | NBA Playoffs Predictions",
  description:
    "See which users still owe a pick for open predictions before they lock.",
}

export default function ShamingPage() {
  return <ShamingClient />
}
