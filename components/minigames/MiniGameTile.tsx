import type { ComponentType } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/app/lib/utils/cn"
import type { LucideIcon } from "lucide-react"

type TileIconProps = { className?: string; strokeWidth?: number }

type TileIcon = LucideIcon | ComponentType<TileIconProps>

type MiniGameTileProps = {
  href: string
  title: string
  description: string
  icon: TileIcon
}

export function MiniGameTile({
  href,
  title,
  description,
  icon: Icon,
}: MiniGameTileProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group mx-auto block w-full max-w-sm rounded-xl outline-none sm:mx-0 sm:max-w-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      )}
    >
      <Card
        className={cn(
          "aspect-square h-full transition-all duration-200",
          "border-border/80 bg-card",
          "hover:border-primary/40 hover:bg-accent/30 hover:shadow-md",
          "group-active:scale-[0.99]"
        )}
      >
        <CardContent className="flex h-full min-h-0 flex-col items-center justify-center gap-2 p-3 text-center sm:gap-4 sm:p-6 md:p-8">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/15 sm:h-16 sm:w-16"
            aria-hidden
          >
            <Icon className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.75} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-semibold leading-tight tracking-tight sm:text-xl">
              {title}
            </h2>
            <p className="text-xs leading-snug text-muted-foreground sm:text-sm">
              {description}
            </p>
          </div>
          <span className="text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 sm:text-sm">
            Play →
          </span>
        </CardContent>
      </Card>
    </Link>
  )
}
