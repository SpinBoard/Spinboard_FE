"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import "./freebiz-primitives.css";

export interface FreebizLimitRowProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  // The final "Total" row in a cost/summary breakdown — heavier, accent-coloured.
  total?: boolean;
}

// design/freebiz-mockup.html .limit — a label/value line in a dashed-rule
// stack (cost estimates, referral counts, payout summaries).
export const LimitRow = React.forwardRef<HTMLDivElement, FreebizLimitRowProps>(
  ({ label, value, total, className, ...props }, ref) => (
    <div ref={ref} className={cn("fb-limit", total && "fb-limit--total", className)} {...props}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
);
LimitRow.displayName = "LimitRow";
