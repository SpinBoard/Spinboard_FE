"use client";

import Link from "next/link";
import { useAtomValue } from "jotai";
import { Copy, Megaphone, Trophy } from "lucide-react";
import { toast } from "sonner";
import { userAtom } from "@/atom/user";
import { usePromoteCampaigns, usePromoteLeaderboard, usePromoteLinksMine } from "@/hooks/use-promote";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Stat } from "@/components/ui/freebiz-stat";
import { Pill } from "@/components/ui/freebiz-pill";
import { Button } from "@/components/ui/freebiz-button";
import { Avatar } from "@/components/ui/freebiz-avatar";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeadCell,
  TableCell,
} from "@/components/ui/freebiz-table";
import { routes } from "@/app/_utils/routes";

// design/freebiz-mockup.html data-screen="v-promote" — visual reference
// only. The mockup shows a per-campaign pot/leaderboard/"your rank in this
// contest" — the real mechanic (docs/FRONTEND_IMPLEMENTATION_GUIDE.md §2
// Revamp 5) is one platform-wide cumulative leaderboard across every
// campaign a promoter has shared, decided by a prize period — auto-opened
// and auto-settled weekly by a daily job since 2026-09-02, with manual
// admin override still possible — so this screen is built as "my shares" +
// the leaderboard rather than a per-contest card. The brief gap between an
// auto-settle and the next auto-open (leaderboard.period: null) is a
// normal transient state, not an error — already handled below by the
// existing "No prize period open right now" branch.
//
// "Browse campaigns" added 2026-08-30: GET /promote/campaigns was long
// documented (§11 of FRONTEND_IMPLEMENTATION_GUIDE.md, and this file's own
// prior version of this comment) as a backend gap that didn't exist yet —
// a viewer was said to only ever reach a campaign via a direct link. That
// turned out to be stale: the endpoint exists live, works for any
// signed-in role, and already had 4 real active brand campaigns sitting
// behind it with no UI ever calling it. Fixed here rather than left as a
// permanent "ask a brand for a link" dead end.
export default function PromotePage() {
  const user = useAtomValue(userAtom);
  const { data: campaigns, isLoading: loadingCampaigns } = usePromoteCampaigns(!!user?.accessToken);
  const { data: links, isLoading: loadingLinks } = usePromoteLinksMine(!!user?.accessToken);
  const { data: leaderboard, isLoading: loadingLeaderboard } = usePromoteLeaderboard();
  const activeCampaigns = (campaigns ?? []).filter((c) => c.status === "ACTIVE");

  const myTotal = leaderboard?.entries.find((e) => e.promoterUserId === user?.id)?.likeCount ?? 0;
  const myRank = leaderboard?.entries.find((e) => e.promoterUserId === user?.id)?.rank;

  const copyLink = (shareUrl: string) => {
    navigator.clipboard?.writeText(shareUrl);
    toast.success("Link copied.");
  };

  if (loadingCampaigns || loadingLinks || loadingLeaderboard) {
    return <PageLoader withLayout={false} message="Loading Promote & Earn..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--faint)",
            }}>
            Viewers / Promote &amp; earn
          </p>
          <h1
            className="mt-1"
            style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
            Share campaigns, climb the leaderboard
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Likes are cumulative across every campaign you&apos;ve shared — one running total, one
            grand prize per period.
          </p>
        </div>
        {leaderboard?.period ? (
          <Pill tone="warn" dot>{leaderboard.period.prizeDescription}</Pill>
        ) : (
          <Pill tone="default">No prize period open right now</Pill>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Stat label="Your cumulative likes" value={myTotal} valueColor="var(--free)" />
        <Stat label="Your rank" value={myRank ? `#${myRank}` : "Unranked"} />
      </div>

      <Link href={routes.USER.WINNER_SUBMISSIONS} className="inline-block">
        <Button variant="ghost">Shared a campaign publicly? Claim a bonus &rarr;</Button>
      </Link>

      <Card>
        <div className="flex items-center gap-2">
          <Megaphone className="h-4 w-4" style={{ color: "var(--free)" }} />
          <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Browse campaigns</h3>
        </div>
        <p className="fb-hint mt-1">Pick one, grab your link, start sharing — every like you drive counts.</p>
        {activeCampaigns.length === 0 ? (
          <CardNote className="mt-3">
            No campaigns posted yet — check back soon, or share a link a brand sent you directly.
          </CardNote>
        ) : (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeCampaigns.map((campaign) => (
              <Link
                key={campaign._id}
                href={routes.PROMOTE_CAMPAIGN(campaign._id)}
                className="rounded-xl overflow-hidden block"
                style={{ background: "var(--ink-900)", border: "1px solid var(--line)" }}>
                <div className="aspect-video" style={{ background: "var(--ink-800)" }}>
                  {campaign.mediaType === "video" ? (
                    <video src={campaign.mediaUrl} muted className="w-full h-full object-cover" />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={campaign.mediaUrl} alt={campaign.title} className="w-full h-full object-cover" />
                  )}
                </div>
                <div className="p-3">
                  <p className="fb-hint">{campaign.brandName}</p>
                  <b style={{ fontSize: 13.5, color: "var(--txt)" }} className="block truncate">
                    {campaign.title}
                  </b>
                  <p className="mt-1 line-clamp-2" style={{ fontSize: 12.5, color: "var(--muted)" }}>
                    {campaign.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-4 items-start">
        <Card tight>
          <div className="flex items-center gap-2 px-3 pt-2 pb-1">
            <Trophy className="h-4 w-4" style={{ color: "var(--free)" }} />
            <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Leaderboard</h3>
          </div>
          {!leaderboard || leaderboard.entries.length === 0 ? (
            <CardNote className="px-3 pb-3">No likes recorded yet for this period.</CardNote>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>#</TableHeadCell>
                  <TableHeadCell>Promoter</TableHeadCell>
                  <TableHeadCell style={{ textAlign: "right" }}>Likes</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaderboard.entries.map((entry) => (
                  <TableRow
                    key={entry.promoterUserId}
                    style={entry.promoterUserId === user?.id ? { background: "rgba(255,210,63,.06)" } : undefined}>
                    <TableCell className="fb-hint" style={{ fontFamily: "var(--mono)" }}>{entry.rank}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar initials={entry.displayName.charAt(0).toUpperCase()} />
                        <b style={{ color: "var(--txt)" }}>
                          {entry.promoterUserId === user?.id ? "You" : entry.displayName}
                        </b>
                      </div>
                    </TableCell>
                    <TableCell style={{ textAlign: "right", fontFamily: "var(--mono)", fontWeight: 700, color: "var(--free)" }}>
                      {entry.likeCount.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>

        <Card>
          <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>My shares</h3>
          <p className="fb-hint mt-1">Every campaign you&apos;ve grabbed a link for, and what it&apos;s driven.</p>
          {!links || links.length === 0 ? (
            <CardNote className="mt-3">
              You haven&apos;t shared a campaign yet — pick one above, or follow a link a brand or another
              promoter sent you, then grab your own share link from there.
            </CardNote>
          ) : (
            <div className="mt-3 space-y-2.5">
              {links.map((link) => (
                <div key={link.linkId} className="p-2.5 rounded-lg" style={{ background: "var(--ink-900)", border: "1px solid var(--line)" }}>
                  <div className="flex items-center justify-between gap-2">
                    <b style={{ fontSize: 13, color: "var(--txt)" }} className="truncate">
                      {link.campaign?.title ?? "Campaign"}
                    </b>
                    <Pill tone="live">{link.likeCount} like{link.likeCount !== 1 ? "s" : ""}</Pill>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <Link href={routes.PROMOTE_CAMPAIGN(link.campaignId)} style={{ color: "var(--accent)", fontSize: 12.5 }}>
                      View campaign
                    </Link>
                    <Button size="sm" variant="ghost" onClick={() => copyLink(link.shareUrl)}>
                      <Copy className="h-3.5 w-3.5" />
                      Copy link
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
