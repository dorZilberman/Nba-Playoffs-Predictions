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
  const [isTouchDevice, setIsTouchDevice] = React.useState(false)
  const tooltipRef = React.useRef<HTMLDivElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Detect touch device
  React.useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }
    checkTouch()
    window.addEventListener('resize', checkTouch)
    return () => window.removeEventListener('resize', checkTouch)
  }, [])

  // Handle click outside to close tooltip on mobile
  React.useEffect(() => {
    if (!isVisible || !isTouchDevice) return

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

    // Use a small delay to avoid immediate closure
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isVisible, isTouchDevice])

  React.useEffect(() => {
    if (isVisible && tooltipRef.current && containerRef.current) {
      // Use requestAnimationFrame to ensure tooltip is rendered before measuring
      requestAnimationFrame(() => {
        if (!tooltipRef.current || !containerRef.current) return
        
        const tooltip = tooltipRef.current
        const container = containerRef.current
        const containerRect = container.getBoundingClientRect()
        const tooltipRect = tooltip.getBoundingClientRect()
        
        // Calculate where the tooltip would be if centered
        const centerX = containerRect.left + containerRect.width / 2
        const tooltipHalfWidth = tooltipRect.width / 2
        
        // Check boundaries with some padding (16px)
        const padding = 16
        const leftBoundary = centerX - tooltipHalfWidth
        const rightBoundary = centerX + tooltipHalfWidth
        
        if (leftBoundary < padding) {
          // Would overflow on left
          // Calculate how much we need to shift right to stay in viewport
          const neededShift = padding - leftBoundary
          setPosition("left")
          setLeftOffset(neededShift)
        } else if (rightBoundary > window.innerWidth - padding) {
          // Would overflow on right, align to right edge of container
          setPosition("right")
          setLeftOffset(undefined)
        } else {
          setPosition("center")
          setLeftOffset(undefined)
        }
      })
    } else {
      // Reset position when tooltip is hidden
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

  const handleInteraction = () => {
    if (isTouchDevice) {
      // Toggle on mobile
      setIsVisible((prev) => !prev)
    } else {
      // Show on hover for desktop
      setIsVisible(true)
    }
  }

  const handleLeave = () => {
    if (!isTouchDevice) {
      setIsVisible(false)
    }
  }

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleInteraction}
      onMouseLeave={handleLeave}
      onClick={handleInteraction}
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
            // Ensure tooltip doesn't go off screen
            left: position === "left" 
              ? leftOffset !== undefined 
                ? `${leftOffset}px` 
                : 0 
              : position === "center" 
                ? "50%" 
                : undefined,
            right: position === "right" ? 0 : undefined,
            transform: position === "center" ? "translateX(-50%)" : "none",
            // Add max-width constraint to prevent overflow
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
