"use client"

import * as React from "react"
import { cn } from "@/app/lib/utils/cn"

interface TooltipProps {
  children: React.ReactNode
  content: React.ReactNode
  className?: string
}

export function Tooltip({ children, content, className }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)
  const [position, setPosition] = React.useState<"center" | "left" | "right">("center")
  const [leftOffset, setLeftOffset] = React.useState<number | undefined>(undefined)
  const tooltipRef = React.useRef<HTMLDivElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Handle click outside to close tooltip on touch / pen
  React.useEffect(() => {
    if (!isVisible) return

    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        tooltipRef.current &&
        containerRef.current &&
        !tooltipRef.current.contains(event.target as Node) &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false)
      }
    }

    const timeoutId = window.setTimeout(() => {
      document.addEventListener("click", handleClickOutside, true)
      document.addEventListener("touchstart", handleClickOutside, true)
    }, 0)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener("click", handleClickOutside, true)
      document.removeEventListener("touchstart", handleClickOutside, true)
    }
  }, [isVisible])

  // Measure before paint so the tooltip doesn’t jump after the first frame (mobile + desktop).
  React.useLayoutEffect(() => {
    if (!isVisible) {
      setPosition("center")
      setLeftOffset(undefined)
      return
    }

    const tooltip = tooltipRef.current
    const container = containerRef.current
    if (!tooltip || !container) return

    const containerRect = container.getBoundingClientRect()
    const tooltipRect = tooltip.getBoundingClientRect()

    const centerX = containerRect.left + containerRect.width / 2
    const tooltipHalfWidth = tooltipRect.width / 2

    const padding = 16
    const leftBoundary = centerX - tooltipHalfWidth
    const rightBoundary = centerX + tooltipHalfWidth

    if (leftBoundary < padding) {
      const neededShift = padding - leftBoundary
      setPosition("left")
      setLeftOffset(neededShift)
    } else if (rightBoundary > window.innerWidth - padding) {
      setPosition("right")
      setLeftOffset(undefined)
    } else {
      setPosition("center")
      setLeftOffset(undefined)
    }
  }, [isVisible])

  const getPositionClasses = () => {
    switch (position) {
      case "left":
        return "left-0"
      case "right":
        return "right-0"
      default:
        return "left-1/2 -translate-x-1/2"
    }
  }

  const getArrowPositionClasses = () => {
    switch (position) {
      case "left":
        return "left-4"
      case "right":
        return "right-4"
      default:
        return "left-1/2 -translate-x-1/2"
    }
  }

  /**
   * Mouse: hover to show / leave to hide.
   * Touch/pen: only pointerdown toggles — do NOT use mouseenter + click or iOS will fire
   * synthetic mouse events after touch and toggle twice (flicker).
   */
  const onPointerEnter = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") setIsVisible(true)
  }

  const onPointerLeave = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse") setIsVisible(false)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === "touch" || e.pointerType === "pen") {
      e.preventDefault()
      setIsVisible((v) => !v)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-block touch-manipulation"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onPointerDown={onPointerDown}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={cn(
            "absolute z-50 bottom-full mb-2",
            "min-w-[200px] max-w-[300px]",
            className
          )}
          style={{
            left:
              position === "left"
                ? leftOffset !== undefined
                  ? `${leftOffset}px`
                  : 0
                : position === "center"
                  ? "50%"
                  : undefined,
            right: position === "right" ? 0 : undefined,
            transform: position === "center" ? "translateX(-50%)" : "none",
            maxWidth: `min(300px, calc(100vw - 32px))`,
          }}
        >
          <div className="px-3 py-2 text-sm text-foreground bg-background border border-border rounded-md shadow-lg">
            {content}
          </div>
          {/* Arrow */}
          <div
            className={cn(
              "absolute top-full -mt-px",
              getArrowPositionClasses()
            )}
            style={{
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid hsl(var(--border))",
              transform: position === "center" ? "translateX(-50%)" : undefined,
            }}
          />
          <div
            className={cn(
              "absolute top-full -mt-0.5",
              getArrowPositionClasses()
            )}
            style={{
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid hsl(var(--background))",
              transform: position === "center" ? "translateX(-50%)" : undefined,
            }}
          />
        </div>
      )}
    </div>
  )
}
