import { List, Settings, Store, ShieldCheck, Briefcase, MessageSquare, Star, MessagesSquare, Banknote, Image } from "lucide-react";

// Inline stroke icons copied verbatim from design/freebiz-mockup.html's
// sidebar nav items (same path data mockup uses for both the desktop
// sidebar and the mobile tab bar). 24x24, stroke=currentColor, no fill —
// kept as bare path data so callers control size/color via className.
const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
} as const;

export function BoardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="2" y="4" width="20" height="14" rx="2" />
      <path d="M8 21h8M12 18v3" />
    </svg>
  );
}

export function FreebiesIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <path d="M3 12h18M12 8v12M12 8s-1-4-4-4-2 4 4 4zM12 8s1-4 4-4 2 4-4 4z" />
    </svg>
  );
}

export function WalletIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="3" y="6" width="18" height="13" rx="3" />
      <path d="M16 12.5h2" />
    </svg>
  );
}

export function ProfileIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

export function DashboardIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

export function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function MonitorIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

export function PromoteIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
      <path d="M12 3v13M8 7l4-4 4 4" />
    </svg>
  );
}

export function TrophyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...iconProps} {...props}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M7 6H4v1a4 4 0 0 0 3 3.8M17 6h3v1a4 4 0 0 1-3 3.8M9 20h6M12 14v6" />
    </svg>
  );
}

// No mockup equivalent for these two (Campaigns list, Settings aren't in
// the mockup's nav — see DECISIONS.md rulings #8/#22, they're RESTYLE
// targets the mockup simply didn't cover). Falling back to lucide-react
// rather than hand-drawing path data the mockup never specified.
export { List as CampaignsListIcon, Settings as SettingsIcon, Store as BrandsIcon };

// KYC, B2B Projects/Quotations, and business-contact messaging are
// entirely new (2026-09-02) — no mockup screen exists for any of them, so
// there's no path data to match. Falling back to lucide-react, same as
// the three above.
export {
  ShieldCheck as KycIcon,
  Briefcase as ProjectsIcon,
  MessageSquare as MessagesIcon,
  Star as RatingsIcon,
  MessagesSquare as ForumIcon,
  Banknote as PayoutsIcon,
  Image as SponsoredAdsIcon,
};
