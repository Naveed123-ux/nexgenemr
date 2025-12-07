"use client";

import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface WaitlistBadgeProps {
  matchCount: number;
  hasHighPriority?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * WaitlistBadge component displays a visual indicator for slots with matching waitlist patients
 * - Shows the count of matching patients
 * - Color-coded by priority (red for high priority, yellow for normal)
 * - Clickable to open triage interface
 */
export function WaitlistBadge({
  matchCount,
  hasHighPriority = false,
  onClick,
  className,
}: WaitlistBadgeProps) {
  // Don't render if no matches
  if (matchCount === 0) {
    return null;
  }

  const badgeColor = hasHighPriority
    ? "bg-red-100 text-red-800 hover:bg-red-200 border-red-300"
    : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200 border-yellow-300";

  return (
    <Badge
      className={cn(
        "cursor-pointer transition-colors border",
        badgeColor,
        className
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <Users className="h-3 w-3 mr-1" />
      {matchCount} {matchCount === 1 ? "match" : "matches"}
    </Badge>
  );
}
