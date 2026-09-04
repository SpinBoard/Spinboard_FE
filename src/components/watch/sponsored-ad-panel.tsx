"use client";

import { Megaphone } from "lucide-react";
import { SponsoredAdSlot } from "@/types";

interface SponsoredAdPanelProps {
  ad: SponsoredAdSlot | null | undefined;
  onClick: (ad: SponsoredAdSlot) => void;
}

// New 2026-09-03 — a small, persistent side panel next to the billboard
// itself (design/UI_CONTRACT.md's "Sponsored ad panel"), not a separate
// dashboard screen. Completely separate from the rotating queue slots:
// doesn't time out or advance, just reflects whatever the admin currently
// has ACTIVE. `ad` is null for long stretches — starts empty — so this
// renders its own placeholder rather than expecting backend content.
export function SponsoredAdPanel({ ad, onClick }: SponsoredAdPanelProps) {
  if (!ad) {
    return (
      <div
        className="rounded-lg flex flex-col items-center justify-center gap-1.5 text-center p-4"
        style={{ background: "var(--ink-900)", border: "1px dashed var(--line-2)", minHeight: 120 }}>
        <Megaphone className="h-5 w-5" style={{ color: "var(--faint)" }} />
        <span className="fb-hint">Your ad here</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick(ad)}
      className="block w-full rounded-lg overflow-hidden text-left"
      style={{ border: "1px solid var(--line)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={ad.imageUrl} alt="Sponsored" className="w-full h-auto block" style={{ minHeight: 120, objectFit: "cover" }} />
    </button>
  );
}
