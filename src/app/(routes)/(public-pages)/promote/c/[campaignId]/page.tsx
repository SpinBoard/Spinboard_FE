"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAtomValue } from "jotai";
import Link from "next/link";
import { ArrowLeft, Copy, Heart, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card } from "@/components/ui/freebiz-card";
import { Button } from "@/components/ui/freebiz-button";
import { Pill } from "@/components/ui/freebiz-pill";
import { Steps } from "@/components/ui/freebiz-steps";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { usePromoteCampaign, useCreatePromoteLink } from "@/hooks/use-promote";
import { apiErrorMessage } from "@/app/_utils/helper";
import { userAtom } from "@/atom/user";
import { routes } from "@/app/_utils/routes";
import { toast } from "sonner";

// design/freebiz-mockup.html data-screen="v-promote"'s "sharebox" component,
// reused as visual reference only — the data model is entirely different
// (docs/FRONTEND_IMPLEMENTATION_GUIDE.md §2 Revamp 5): no per-campaign prize
// pot, no per-campaign leaderboard. This is the page a viewer lands on to
// grab their own share link for a specific campaign — reached either via a
// direct link a brand or another promoter posted, or from the "Browse
// campaigns" list on /user/promote (GET /promote/campaigns, wired up
// 2026-08-30 once it turned out to already exist live despite docs saying
// otherwise).
export default function PromoteCampaignPage() {
  const params = useParams();
  const campaignId = params.campaignId as string;
  const user = useAtomValue(userAtom);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const { data: campaign, isLoading, error } = usePromoteCampaign(campaignId);
  const createLink = useCreatePromoteLink();

  const handleGetLink = () => {
    createLink.mutate(campaignId, {
      onSuccess: (link) => setShareUrl(link.shareUrl),
      onError: (err) => toast.error(apiErrorMessage(err, "Couldn't create your share link.")),
    });
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard?.writeText(shareUrl);
    toast.success("Link copied.");
  };

  if (isLoading) return <PageLoader message="Loading campaign..." />;
  if (error || !campaign) {
    return <PageError title="Campaign Not Found" message="This campaign could not be found." showRetry={false} />;
  }

  const shareTargets = shareUrl
    ? [
        { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(shareUrl)}` },
        { label: "X", href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}` },
        { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}` },
      ]
    : [];

  return (
    <MainLayout maxWidth="3xl">
      <Link href={routes.WATCH}>
        <Button variant="ghost" className="mb-4">
          <ArrowLeft className="h-4 w-4" />
          Back to the billboard
        </Button>
      </Link>

      <div className="space-y-4">
        <Card>
          <div className="rounded-xl overflow-hidden mb-3" style={{ background: "var(--ink-900)" }}>
            {campaign.mediaType === "video" ? (
              <video src={campaign.mediaUrl} controls className="w-full max-h-96" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={campaign.mediaUrl} alt={campaign.title} className="w-full max-h-96 object-cover" />
            )}
          </div>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="fb-hint">{campaign.brandName}</p>
              <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 22, color: "var(--txt)" }}>
                {campaign.title}
              </h1>
            </div>
            <Pill tone="live" dot>
              <Heart className="h-3 w-3" /> {(campaign.likeCount ?? 0).toLocaleString()} likes all time
            </Pill>
          </div>
          <p className="mt-2" style={{ color: "var(--muted)", fontSize: 13.5 }}>{campaign.description}</p>
          {campaign.status === "PAUSED" && (
            <p className="mt-2 fb-hint" style={{ color: "var(--spent)" }}>
              This campaign is currently paused — new likes on its share links won&apos;t count until it&apos;s active again.
            </p>
          )}
        </Card>

        <Card>
          <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Share this campaign</h3>
          <p className="fb-hint mt-1">
            Get a personal link, post it anywhere. Every signed-in like on your link — across every
            campaign you share — adds to your spot on the leaderboard.
          </p>

          {!shareUrl ? (
            user ? (
              <Button variant="primary" className="mt-3" disabled={createLink.isPending} onClick={handleGetLink}>
                {createLink.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Get my link
              </Button>
            ) : (
              <Link
                href={`${routes.LOGIN}?returnTo=${encodeURIComponent(routes.PROMOTE_CAMPAIGN(campaignId))}`}
                className="inline-block mt-3">
                <Button variant="primary">Sign in to get your link</Button>
              </Link>
            )
          ) : (
            <div className="mt-3 p-3 rounded-xl space-y-3" style={{ background: "var(--ink-900)", border: "1px solid var(--line)" }}>
              <p style={{ fontFamily: "var(--mono)", fontSize: 13, color: "var(--txt)", letterSpacing: "0.02em", wordBreak: "break-all" }}>
                {shareUrl}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="primary" onClick={handleCopy}>
                  <Copy className="h-3.5 w-3.5" />
                  Copy link
                </Button>
                {shareTargets.map((t) => (
                  <a key={t.label} href={t.href} target="_blank" rel="noreferrer">
                    <Button size="sm" variant="ghost">{t.label}</Button>
                  </a>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>How it works</h3>
          <Steps
            className="mt-2.5"
            items={[
              { title: "Grab your link.", description: "It's unique to you and to this campaign." },
              { title: "Post it anywhere.", description: "WhatsApp status, X, Instagram bio, group chats." },
              { title: "They like it there.", description: "Signed in, once per person on this link — though nothing stops them from also liking your other campaigns." },
              {
                title: "Likes add up across every campaign.",
                description: "There's no single-campaign pot — the leaderboard tracks your running total.",
              },
            ]}
          />
        </Card>

        <Link href={routes.USER.PROMOTE} className="inline-block">
          <Button variant="ghost">See the leaderboard &amp; your shares</Button>
        </Link>
      </div>
    </MainLayout>
  );
}
