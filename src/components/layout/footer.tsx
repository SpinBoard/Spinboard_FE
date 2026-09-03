"use client";

import Link from "next/link";
import { LogoMark, Wordmark } from "@/components/shell/logo-mark";
import { routes } from "@/app/_utils/routes";

// Public-site chrome, restyled onto tokens.css + the Freebiz wordmark as
// the Phase E follow-up (see header.tsx's note).
export function Footer() {
  return (
    <footer
      className="py-14"
      style={{ background: "var(--ink-900)", color: "var(--txt)" }}>
      <div className="px-[5%] mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <LogoMark />
            <Wordmark />
          </div>
          {/* Only routes that actually have a page. routes.ts also declares
              PRIVACY/TERMS/CONTACT/HELP, but none of those pages exist yet —
              linking them here would 404, and the previous version's dead
              href="#" placeholders (Blog, Help Center) were no better. Add
              them back here when the pages ship. */}
          <div className="flex flex-wrap justify-center gap-6 md:gap-8">
            <Link
              href={routes.ABOUT}
              style={{ color: "var(--muted)", fontSize: 13.5 }}
              className="transition-colors hover:opacity-80">
              About
            </Link>
            <Link
              href={routes.MARKETPLACE}
              style={{ color: "var(--muted)", fontSize: 13.5 }}
              className="transition-colors hover:opacity-80">
              Brands
            </Link>
            <Link
              href={routes.WATCH}
              style={{ color: "var(--muted)", fontSize: 13.5 }}
              className="transition-colors hover:opacity-80">
              Billboard
            </Link>
          </div>
          <p
            className="text-center md:text-left"
            style={{ color: "var(--faint)", fontSize: 11.5 }}>
            © 2025 Freebiz. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
