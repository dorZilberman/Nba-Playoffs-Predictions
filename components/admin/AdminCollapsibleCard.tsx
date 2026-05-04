"use client"

import { useId, useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/app/lib/utils/cn"

type AdminCollapsibleCardProps = {
  title: string
  /** Shown only while expanded. Use a `div` if you need block-level children. */
  description?: ReactNode
  defaultOpen?: boolean
  contentClassName?: string
  children: ReactNode
}

export function AdminCollapsibleCard({
  title,
  description,
  defaultOpen = true,
  contentClassName,
  children,
}: AdminCollapsibleCardProps) {
  const [open, setOpen] = useState(defaultOpen)
  const panelId = useId()

  return (
    <Card>
      <CardHeader className="space-y-3 pb-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle
            id={`${panelId}-heading`}
            className="text-xl leading-snug tracking-tight"
          >
            {title}
          </CardTitle>
          <button
            type="button"
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            aria-labelledby={`${panelId}-heading`}
            aria-label={open ? "Collapse section" : "Expand section"}
          >
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 transition-transform duration-200",
                open && "rotate-180"
              )}
              aria-hidden
            />
          </button>
        </div>
        {open && description != null && (
          <div className="text-sm text-muted-foreground text-pretty [&_p]:mb-0">
            {description}
          </div>
        )}
      </CardHeader>
      {open && (
        <CardContent id={panelId} className={cn("pt-0", contentClassName)}>
          {children}
        </CardContent>
      )}
    </Card>
  )
}
