"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { isAxiosError } from "axios";
import { Heart, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card } from "@/components/ui/freebiz-card";
import { Button } from "@/components/ui/freebiz-button";
import { Pill } from "@/components/ui/freebiz-pill";
import { useLikePromoCampaign } from "@/hooks/use-promote";
import { apiErrorCode, apiErrorMessage } from "@/app/_utils/helper";
import { routes } from "@/app/_utils/routes";

type ResultState =
  | { kind: "liked"; alreadyLiked: boolean }
  | { kind: "account-too-new" }
  | { kind: "self-like" }
  | { kind: "not-active" }
  | { kind: "login-required" }
  | { kind: "error"; message: string };

// This is what a promoter's shareUrl resolves to
// (docs/FRONTEND_IMPLEMENTATION_GUIDE.md §7, "The share link's own landing
// page"). There is deliberately no campaign-lookup-by-slug endpoint —
// POST /promote/like/:slug does the lookup and records the like in the same
// call — so unlike a normal detail page, this one can't preview the
// campaign's title/media before the visitor acts. The copy stays generic
// until after a successful like.
//
// Confirmed 2026-08-31 against the backend's actual route wiring
// (GET /promote/l/:slug is optionalAuth — anyone can land here and read;
// POST /promote/like/:slug is hard isAuthenticated — no account, no like,
// full stop, 401 before the like logic ever runs): a first-time visitor
// with no account is structurally forced through signup before their like
// counts, while an already-registered visitor clicking a different link
// just likes immediately, no signup prompt. This page already reacted
// correctly to that 401. What didn't work: the "Log in" link here carried
// `returnTo` back to this exact page, but `/login`'s own "Sign up" link (and
// `/register`'s "Sign in" link) silently dropped `returnTo` on that hop —
// so a brand-new visitor who had to go signup→verify-otp landed on their
// default dashboard instead of back here. Fixed in both of those pages;
// this page also now offers "sign up" directly, not just "Log in".
//
// Confirmed 2026-08-31, second pass — the uniqueness backing `alreadyLiked`
// is per (likerUserId, promoterUserId, campaignId), not a global one-vote-
// ever rule: the same visitor can freely vote for a different promoter, or
// for the same promoter's other campaigns — each is independent. Since
// minting a share link is itself idempotent (one promoter always gets the
// same slug for a given campaign), that uniqueness key is equivalent to
// "per slug" in practice, so no gating logic changed here — only the copy,
// which previously read ambiguously enough that a viewer might assume one
// like anywhere used up their only vote everywhere. Verified live: liking
// twice on the same slug returns the identical like `_id`/`createdAt` both
// times (no second record), confirming true idempotency, not a rejection.
// promote.minAccountAgeHours was also dropped to 0 live this same pass —
// the "account-too-new" branch below is kept regardless, since that's a
// config value the backend can raise again without a frontend deploy.
export default function PromoteLinkLandingPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [result, setResult] = useState<ResultState | null>(null);
  const likeMutation = useLikePromoCampaign();

  const handleLike = () => {
    setResult(null);
    likeMutation.mutate(slug, {
      onSuccess: (data) => setResult({ kind: "liked", alreadyLiked: !!data.alreadyLiked }),
      onError: (error) => {
        const status = isAxiosError(error) ? error.response?.status : undefined;
        const code = apiErrorCode(error);
        if (status === 401) return setResult({ kind: "login-required" });
        if (code === "ACCOUNT_TOO_NEW") return setResult({ kind: "account-too-new" });
        if (code === "SELF_LIKE_NOT_ALLOWED") return setResult({ kind: "self-like" });
        if (code === "CAMPAIGN_NOT_ACTIVE") return setResult({ kind: "not-active" });
        setResult({ kind: "error", message: apiErrorMessage(error, "Couldn't like this campaign.") });
      },
    });
  };

  return (
    <MainLayout maxWidth="sm">
      <Card>
        <div
          className="rounded-xl mb-4 flex items-center justify-center"
          style={{ aspectRatio: "16/10", background: "linear-gradient(135deg, var(--free), var(--brand))" }}>
          <Heart className="h-10 w-10" style={{ color: "var(--ink-900)" }} />
        </div>
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 20, color: "var(--txt)" }}>
          You&apos;ve been invited to like a campaign
        </h1>
        <p className="mt-1.5" style={{ color: "var(--muted)", fontSize: 13.5 }}>
          Someone shared this campaign with you on Freebiz. Sign in and like it here — it counts once,
          for this promoter on this campaign — and adds to their spot on the Promote &amp; Earn
          leaderboard.
        </p>

        {result?.kind !== "liked" && (
          <Button variant="primary" className="w-full justify-center mt-4" disabled={likeMutation.isPending} onClick={handleLike}>
            {likeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Heart className="h-4 w-4" />}
            Like this campaign
          </Button>
        )}

        {result?.kind === "liked" && (
          <div
            className="mt-4 p-3 rounded-xl"
            style={
              result.alreadyLiked
                ? { background: "rgba(255,210,63,.08)", border: "1px solid var(--free)" }
                : { background: "rgba(61,220,151,.08)", border: "1px solid var(--live)" }
            }>
            <Pill tone={result.alreadyLiked ? "warn" : "live"} dot>
              {result.alreadyLiked ? "Already voted" : "Liked!"}
            </Pill>
            <p className="mt-2" style={{ color: "var(--txt)", fontSize: 13.5 }}>
              {result.alreadyLiked
                ? "You've already voted for this promoter on this campaign, so this visit didn't add another vote. You're still free to vote for other promoters, or for this promoter's other campaigns."
                : "Thanks — that counts toward the promoter's leaderboard total."}
            </p>
          </div>
        )}

        {result?.kind === "login-required" && (
          <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
            You need a Freebiz account to like this — come right back and try again once you&apos;re in.{" "}
            <Link href={`${routes.LOGIN}?returnTo=${encodeURIComponent(routes.PROMOTE_LANDING(slug))}`} style={{ color: "var(--accent)" }}>
              Log in
            </Link>
            {" "}or{" "}
            <Link href={`${routes.REGISTER}?returnTo=${encodeURIComponent(routes.PROMOTE_LANDING(slug))}`} style={{ color: "var(--accent)" }}>
              sign up
            </Link>
          </p>
        )}

        {result?.kind === "account-too-new" && (
          <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
            Your account needs to be a little older before your like counts here — come back in a bit.
          </p>
        )}

        {result?.kind === "self-like" && (
          <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
            This is your own share link — likes on your own link don&apos;t count.
          </p>
        )}

        {result?.kind === "not-active" && (
          <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
            This campaign has been paused by its brand and isn&apos;t accepting likes right now.
          </p>
        )}

        {result?.kind === "error" && (
          <p className="mt-3 text-sm" style={{ color: "var(--spent)" }}>{result.message}</p>
        )}

        <div className="mt-4 pt-4 text-center" style={{ borderTop: "1px solid var(--line)" }}>
          <Link href={routes.WATCH} style={{ color: "var(--accent)", fontSize: 13 }}>
            What is Freebiz?
          </Link>
        </div>
      </Card>
    </MainLayout>
  );
}
