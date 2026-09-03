"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import "./freebiz-primitives.css";

export interface FreebizProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  // 0–100.
  value: number;
  // Defaults to var(--live) — the mockup's own default fill colour;
  // overridden to var(--free) for the freebie-progress instances.
  color?: string;
}

// design/freebiz-mockup.html .progress
export const Progress = React.forwardRef<HTMLDivElement, FreebizProgressProps>(
  ({ value, color = "var(--live)", className, ...props }, ref) => (
    <div ref={ref} className={cn("fb-progress", className)} {...props}>
      <i style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  )
);
Progress.displayName = "Progress";
