"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import "./freebiz-primitives.css";

export interface FreebizFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
}

// design/freebiz-mockup.html .field — label + input/textarea + optional
// .hint, stacked. The input itself is passed as children (Input/Textarea)
// so Field stays agnostic to which one it's wrapping.
export const Field = React.forwardRef<HTMLDivElement, FreebizFieldProps>(
  ({ label, htmlFor, hint, className, children, ...props }, ref) => (
    <div ref={ref} className={cn("fb-field", className)} {...props}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {hint !== undefined && <span className="fb-hint">{hint}</span>}
    </div>
  )
);
Field.displayName = "Field";
