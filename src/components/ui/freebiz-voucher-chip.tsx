"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import "./freebiz-primitives.css";

export interface FreebizVoucherChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  code: React.ReactNode;
  // The value tag shown after the code, e.g. "₦2,000".
  value?: React.ReactNode;
  used?: boolean;
}

// design/freebiz-mockup.html .voucher — the signature primitive. Mint
// (live/claimable) vs. red (used/gone) are the only two colours this
// component ever carries — see CLAUDE-UI.md's "one rule worth repeating".
export const VoucherChip = React.forwardRef<HTMLSpanElement, FreebizVoucherChipProps>(
  ({ code, value, used, className, ...props }, ref) => (
    <span ref={ref} className={cn("fb-voucher", used && "fb-voucher--used", className)} {...props}>
      {code}
      {value !== undefined && <span className="fb-voucher__tag">{value}</span>}
    </span>
  )
);
VoucherChip.displayName = "VoucherChip";
