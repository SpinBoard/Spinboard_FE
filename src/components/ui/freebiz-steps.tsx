"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import "./freebiz-primitives.css";

export interface FreebizStep {
  title: React.ReactNode;
  description?: React.ReactNode;
}

export interface FreebizStepsProps extends React.OlHTMLAttributes<HTMLOListElement> {
  items: FreebizStep[];
}

// design/freebiz-mockup.html .steps — a numbered "what happens next" list,
// e.g. Review → Cleared or sent back → On the board.
export const Steps = React.forwardRef<HTMLOListElement, FreebizStepsProps>(
  ({ items, className, ...props }, ref) => (
    <ol ref={ref} className={cn("fb-steps", className)} {...props}>
      {items.map((item, i) => (
        <li key={i}>
          <b>{item.title}</b>
          {item.description !== undefined ? <> {item.description}</> : null}
        </li>
      ))}
    </ol>
  )
);
Steps.displayName = "Steps";
