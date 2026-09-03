"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import "./freebiz-primitives.css";

export interface FreebizPillProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "default" | "live" | "warn" | "bad" | "info" | "brandish";
  // A leading status dot — "pulse" for the animated live-indicator variant
  // (e.g. "3,418 watching"), true for a static dot.
  dot?: boolean | "pulse";
}

// design/freebiz-mockup.html .pill
export const Pill = React.forwardRef<HTMLSpanElement, FreebizPillProps>(
  ({ tone = "default", dot, className, children, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("fb-pill", tone !== "default" && `fb-pill--${tone}`, className)}
      {...props}>
      {dot && <span className={cn("fb-dot", dot === "pulse" && "fb-dot--pulse")} />}
      {children}
    </span>
  )
);
Pill.displayName = "Pill";
