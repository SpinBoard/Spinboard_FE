"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import "./freebiz-primitives.css";

export interface FreebizButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "primary" | "ghost" | "danger";
  size?: "default" | "sm";
}

// design/freebiz-mockup.html .btn — variant and size are independent and
// combine freely (e.g. the mockup's own "btn sm ghost" table row actions).
export const Button = React.forwardRef<HTMLButtonElement, FreebizButtonProps>(
  ({ variant = "default", size = "default", className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "fb-btn",
        variant !== "default" && `fb-btn--${variant}`,
        size === "sm" && "fb-btn--sm",
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
