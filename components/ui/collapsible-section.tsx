"use client"

import { useState } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/app/lib/utils/cn"

type CollapsibleSectionProps = {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

export function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
  className,
  contentClassName,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className={cn(
        "bg-background border rounded-lg overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 md:px-6 md:py-4 text-left hover:bg-muted/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-expanded={open}
      >
        <span className="text-lg font-semibold tracking-tight">{title}</span>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180"
          )}
          aria-hidden
        />
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
