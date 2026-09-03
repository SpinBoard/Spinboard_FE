"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import "./freebiz-primitives.css";

export interface FreebizStatProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  // Trailing small text after the value, e.g. the "days" in "9 days".
  suffix?: React.ReactNode;
  detail?: React.ReactNode;
  // e.g. "var(--live)" to highlight a value the way the mockup does for
  // "Still unclaimed" / "In review" stat tiles.
  valueColor?: string;
}

// design/freebiz-mockup.html .stat
export const Stat = React.forwardRef<HTMLDivElement, FreebizStatProps>(
  ({ label, value, suffix, detail, valueColor, className, ...props }, ref) => (
    <div ref={ref} className={cn("fb-stat", className)} {...props}>
      <div className="fb-stat__k">{label}</div>
      <div className="fb-stat__v" style={valueColor ? { color: valueColor } : undefined}>
        {value}
        {suffix !== undefined && <small>{suffix}</small>}
      </div>
      {detail !== undefined && <div className="fb-stat__d">{detail}</div>}
    </div>
  )
);
Stat.displayName = "Stat";
