"use client";

import Link from "next/link";
import { Trophy } from "lucide-react";
import { routes } from "@/app/_utils/routes";
import { useTryAgainStatus } from "@/hooks/use-spin";

// "Always-visible try-again count for logged-in users" — rendered in the
// header nav for gamers only. Links through to the special-boards page.
export function TryAgainBadge() {
  const { data } = useTryAgainStatus(true);

  return (
    <Link
      href={routes.USER.TRY_AGAIN}
      data-testid="try-again-badge"
      className="flex items-center gap-1.5 rounded-full border border-border bg-white/5 px-3 py-1.5 text-sm text-foreground hover:bg-white/10 transition-colors">
      <Trophy className="h-4 w-4 text-primary" />
      {data?.tryAgainCount ?? 0}
    </Link>
  );
}
