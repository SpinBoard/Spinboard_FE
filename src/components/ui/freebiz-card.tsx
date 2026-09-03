"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import "./freebiz-primitives.css";

export interface FreebizCardProps extends React.HTMLAttributes<HTMLDivElement> {
  tight?: boolean;
}

// design/freebiz-mockup.html .card — a loose container; most screens just
// drop an <h3>/<CardNote>/arbitrary content straight inside it rather than
// a fixed header/body/footer structure, so this stays a single wrapper
// rather than the shadcn Card/CardHeader/CardContent split.
export const Card = React.forwardRef<HTMLDivElement, FreebizCardProps>(
  ({ tight, className, ...props }, ref) => (
    <div ref={ref} className={cn("fb-card", tight && "fb-card--tight", className)} {...props} />
  )
);
Card.displayName = "Card";

export function CardNote({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("fb-card-note", className)} {...props} />;
}
