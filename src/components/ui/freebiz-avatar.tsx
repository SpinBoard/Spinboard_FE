"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import "./freebiz-primitives.css";

export interface FreebizAvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  initials: React.ReactNode;
  // Any of the meaning tokens, e.g. "var(--free)" — matches the mockup's
  // per-instance background on each feed/table avatar. Defaults to
  // var(--free), the mockup's own default.
  background?: string;
  // Text colour — defaults to var(--ink-900) (the mockup's literal #0E0C16,
  // token-equivalent). The mockup overrides this to white by hand on the
  // --brand background specifically, for contrast — pass color="white"
  // (a keyword, not a hex literal) to match that.
  color?: string;
}

// design/freebiz-mockup.html .avatar
export const Avatar = React.forwardRef<HTMLSpanElement, FreebizAvatarProps>(
  ({ initials, background = "var(--free)", color = "var(--ink-900)", style, className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn("fb-avatar", className)}
      style={{ background, color, ...style }}
      {...props}>
      {initials}
    </span>
  )
);
Avatar.displayName = "Avatar";
