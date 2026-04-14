"use client"

import { useState, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/app/lib/utils/cn"

type CollapsibleSectionProps = {
  title: string
  /** Shown to the left of the chevron (e.g. section points). */
  headerRight?: ReactNode
  defaultOpen?: boolean
  children: ReactNode
  className?: string
  contentClassName?: string
  /** Root element id (e.g. for scroll / programmatic expand). */
  id?: string
}

export function CollapsibleSection({
  title,
  headerRight,
  defaultOpen = true,
  children,
  className,
  contentClassName,
  id,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      id={id}
      className={cn(
        "bg-background border rounded-lg overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full min-w-0 items-center gap-3 px-4 py-3 md:px-6 md:py-4 text-left hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 truncate text-lg font-semibold tracking-tight">
          {title}
        </span>
        <div className="flex shrink-0 items-center gap-2">
          {headerRight}
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
              open && "rotate-180"
            )}
            aria-hidden
          />
        </div>
      </button>
      <div
        className={cn(
          open ? "block" : "hidden",
          "border-t border-border",
          contentClassName ?? "p-4 md:p-6 pt-4"
        )}
      >
        {children}
      </div>
    </div>
  )
}
