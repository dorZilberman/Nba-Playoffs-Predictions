"use client"

import { Button } from "@/components/ui/button"
import { cn } from "@/app/lib/utils/cn"

type SegmentedControlProps<T extends string> = {
  value: T
  onChange: (value: T) => void
  options: readonly { value: T; label: string }[]
  className?: string
  "aria-label"?: string
  isOptionDisabled?: (value: T) => boolean
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
  "aria-label": ariaLabel,
  isOptionDisabled,
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
        const disabled = isOptionDisabled?.(opt.value) === true
        return (
          <Button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            size="sm"
            variant={selected ? "default" : "ghost"}
            className={cn("h-8 px-3 shadow-none", disabled && "opacity-45")}
            onClick={() => {
              if (disabled) return
              onChange(opt.value)
            }}
          >
            {opt.label}
          </Button>
        )
      })}
    </div>
  )
}
