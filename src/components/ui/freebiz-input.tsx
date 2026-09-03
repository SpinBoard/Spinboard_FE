"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import "./freebiz-primitives.css";

// design/freebiz-mockup.html .input — the mockup reuses one class for both
// <input> and <textarea> (see the campaign-description field in b-new), so
// both are exported here rather than splitting into a separate primitive.
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn("fb-input", className)} {...props} />
  )
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn("fb-input", className)} {...props} />
));
Textarea.displayName = "Textarea";
