"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/app/lib/utils/cn"

type SegmentedControlProps<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: string }[]
  className?: string
  "aria-label"?: string
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  "aria-label": ariaLabel,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex rounded-lg border border-input bg-muted/40 p-0.5 gap-0.5",
        className
      )}
    >
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <Button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            size="sm"
            variant={selected ? "default" : "ghost"}
            className="h-8 px-3 shadow-none"
            onClick={() => onChange(opt.value)}
          >
            {opt.label}
          </Button>
        )
      })}
    </div>
  )
}
