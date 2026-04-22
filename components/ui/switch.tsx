"use client"

import * as React from "react"
import { cn } from "@/app/lib/utils/cn"

export type SwitchProps = {
  id?: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  disabled?: boolean
  className?: string
  "aria-label"?: string
  "aria-labelledby"?: string
}

export function Switch({
  id,
  checked,
  onCheckedChange,
  disabled,
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
}: SwitchProps) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      disabled={disabled}
      className={cn(
        "peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 overflow-hidden",
        checked ? "bg-primary" : "bg-input",
        className
      )}
      onClick={() => !disabled && onCheckedChange(!checked)}
    >
      <span
        className={cn(
          "pointer-events-none absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-background shadow-md transition-[left,right] duration-200 ease-in-out",
          checked ? "right-0.5 left-auto" : "left-0.5 right-auto"
        )}
        aria-hidden
      />
    </button>
  )
}
