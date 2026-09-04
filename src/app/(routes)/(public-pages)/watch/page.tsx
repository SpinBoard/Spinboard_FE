"use client";

import { useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { BannerPlayer } from "@/components/watch/banner-player";
import { FreebieTakeover } from "@/components/watch/freebie-takeover";
import { SponsoredAdPanel } from "@/components/watch/sponsored-ad-panel";
import { PerimeterStrip } from "@/components/billboard/perimeter-strip";
import { ApplyBox } from "@/components/billboard/apply-box";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Pill } from "@/components/ui/freebiz-pill";
import { Stat } from "@/components/ui/freebiz-stat";
import { Button } from "@/components/ui/freebiz-button";
import {
  useBillboardClick,
  useBillboardComplete,
  useBillboardHeartbeat,
  useBillboardMyStreak,
  useBillboardQueue,
  useBillboardSession,
  useBillboardStats,
  useSponsoredAdClick,
} from "@/hooks/use-billboard";
import { useRecentCatches, useStripFeed } from "@/hooks/use-freebies";
import { useAdminConfig } from "@/hooks/use-admin-config";
import { userAtom } from "@/atom/user";
import { routes } from "@/app/_utils/routes";
import { BillboardQueueSlot, SponsoredAdSlot } from "@/types";

// design/freebiz-mockup.html data-screen="v-watch". The billboard plays
// continuously — no quiz, no "watch 5 to unlock," nothing to gate on.
// Auth/profile completeness only matter when claiming a freebie code
// (handled inside ApplyBox), never for watching.
//
// GET /billboard/stats, GET /billboard/my-streak, and GET
// /freebies/recent-catches (docs/FRONTEND_IMPLEMENTATION_GUIDE.md §2
// Revamp 6) fill in what was previously dropped for lack of a backing
// endpoint: a live "watching now" count, a cumulative "codes today" total,
// an "ads in rotation" count, a per-viewer streak, and a "who just won"
// feed. "Unclaimed now" is kept exactly as before — it's a real number
// already available from the strip feed this screen already polls.
export default function WatchPage() {
  // userAtom reads localStorage synchronously on the client, so its first
  // client render already reflects a real logged-in user while the server
  // always rendered as a guest (no localStorage there) — same mismatch
  // ProtectedRoute works around elsewhere. Since this page must never gate
  // or block on auth, the fix here isn't a loading spinner, just deferring
  // the guest-vs-signed-in branch one tick so the first client render still
  // matches the server's, then updating right after.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { get } = useAdminConfig();
  const completionFraction = get("billboard.completionWatchFraction");
  const heartbeatToleranceMs = get("billboard.heartbeatToleranceMs");
  const rawUser = useAtomValue(userAtom);
  const user = mounted ? rawUser : null;

  const sessionMutation = useBillboardSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [queue, setQueue] = useState<BillboardQueueSlot[]>([]);
  const [index, setIndex] = useState(0);

  const queueQuery = useBillboardQueue(sessionId);
  const heartbeat = useBillboardHeartbeat();
  const complete = useBillboardComplete();
  const trackClick = useBillboardClick();
  const trackSponsoredAdClick = useSponsoredAdClick();
  const stripFeed = useStripFeed();
  const boardStats = useBillboardStats();
  const myStreak = useBillboardMyStreak(!!user?.accessToken);
  const recentCatches = useRecentCatches();

  const completedForSlot = useRef<string | null>(null);
  const lastHeartbeatAt = useRef(0);
  const applyBoxRef = useRef<HTMLDivElement>(null);
  const [prefillCode, setPrefillCode] = useState<string | undefined>();

  // Defense in depth against a live freebie code taking over the billboard
  // more than once per page load: the backend is supposed to enforce "at
  // most once per session" itself (BillboardSession.shownFreebieCodeIds),
  // but a race between two near-simultaneous GET /billboard/queue calls for
  // the same session (e.g. React StrictMode's dev-only double-invoke of the
  // "fetch next batch" effect below) can read-modify-save past each other
  // and hand back the same still-"unshown" code twice. Track codeIds we've
  // already queued client-side and drop any repeat before it ever reaches
  // `queue`, so the same freebie can't appear as a takeover slot twice —
  // and never hang on-screen because a duplicate slotId with an identical
  // key gets appended right behind the one already playing.
  const shownFreebieCodeIds = useRef<Set<string>>(new Set());
  const refetchedForIndex = useRef<number | null>(null);

  useEffect(() => {
    sessionMutation.mutate(undefined, {
      onSuccess: (id) => setSessionId(id),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const slots = queueQuery.data?.slots;
    if (!slots || slots.length === 0) return;
    const deduped = slots.filter((slot) => {
      if (slot.type !== "FREEBIE" || !slot.codeId) return true;
      if (shownFreebieCodeIds.current.has(slot.codeId)) return false;
      shownFreebieCodeIds.current.add(slot.codeId);
      return true;
    });
    if (deduped.length > 0) {
      setQueue((prev) => [...prev, ...deduped]);
    }
  }, [queueQuery.data]);

  const current = queue[index];

  // Fetch a fresh batch once we're down to the last slot — guarded so a
  // given index only ever triggers one refetch, even if this effect runs
  // twice back to back (StrictMode dev double-invoke) or a previous fetch
  // for the same index is still in flight.
  useEffect(() => {
    if (!sessionId) return;
    if (
      queue.length > 0 &&
      index >= queue.length - 1 &&
      !queueQuery.isFetching &&
      refetchedForIndex.current !== index
    ) {
      refetchedForIndex.current = index;
      queueQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, sessionId, queue.length, queueQuery.isFetching]);

  const advance = () => {
    completedForSlot.current = null;
    lastHeartbeatAt.current = 0;
    setIndex((i) => i + 1);
  };

  const handleTimeUpdate = (watchedMs: number, durationMs: number) => {
    if (!sessionId || !current) return;

    if (watchedMs - lastHeartbeatAt.current >= heartbeatToleranceMs) {
      lastHeartbeatAt.current = watchedMs;
      heartbeat.mutate({ sessionId, slotId: current.slotId, watchedMs });
    }

    const target = durationMs > 0 ? durationMs : current.durationSec * 1000;
    if (
      completedForSlot.current !== current.slotId &&
      target > 0 &&
      watchedMs / target >= completionFraction
    ) {
      completedForSlot.current = current.slotId;
      complete.mutate({ sessionId, slotId: current.slotId, watchedMs });
    }
  };

  const handleEnded = () => {
    if (sessionId && current && completedForSlot.current !== current.slotId) {
      completedForSlot.current = current.slotId;
      complete.mutate({
        sessionId,
        slotId: current.slotId,
        watchedMs: current.durationSec * 1000,
      });
    }
    advance();
  };

  // Navigate immediately with the URL already in hand — never wait on the
  // tracking call, which is fire-and-forget (docs/frontend/BUSINESS_RULES.md
  // "AD slots can carry a clickable website link").
  const handleClickThrough = () => {
    if (!current?.clickUrl) return;
    window.open(current.clickUrl, "_blank", "noopener,noreferrer");
    if (sessionId) trackClick.mutate({ sessionId, slotId: current.slotId });
  };

  // Sponsored-ad panel click — same immediate-navigate-then-track pattern,
  // but public/no-auth and entirely independent of the session/slot loop.
  const handleSponsoredAdClick = (ad: SponsoredAdSlot) => {
    if (ad.clickUrl) window.open(ad.clickUrl, "_blank", "noopener,noreferrer");
    trackSponsoredAdClick.mutate(ad.id);
  };

  const handleClaimFromTakeover = (code: string) => {
    setPrefillCode(code);
    applyBoxRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  };

  const unclaimedNow = (stripFeed.data?.items ?? []).filter(
    (i) => i.kind === "FREEBIE" && i.state === "AVAILABLE"
  ).length;

  const brandLabel = current
    ? current.type === "AD"
      ? current.brandName
      : "Freebiz"
    : undefined;

  return (
    <MainLayout maxWidth="5xl">
      <div className="space-y-5">
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
              Viewers / Billboard
            </p>
            <h1
              className="mt-1"
              style={{
                fontFamily: "var(--display)",
                fontWeight: 800,
                fontSize: 27,
                letterSpacing: "-0.02em",
                color: "var(--txt)",
              }}>
              Everybody is watching the same board
            </h1>
            <p
              className="mt-1"
              style={{ color: "var(--muted)", fontSize: 13.5 }}>
              One billboard. Ads roll non-stop. Freebie codes appear on the
              frame or take over the screen — first person to apply one takes
              it.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Pill tone="live" dot="pulse">
              {boardStats.data
                ? `${boardStats.data.watchingNow.toLocaleString()} watching`
                : "Live"}
            </Pill>
            {/* Removed 2026-08-29 per explicit product direction — claim as
                much as you want, no daily-cap messaging. Note: live
                Config: freebie.dailyClaimCap.CASH is still 1 as of this
                change, so a claim past the first one today can still 403
                DAILY_LIMIT_REACHED (handled reactively in ApplyBox) until
                backend removes the cap to match. */}
          </div>
        </div>

        {/* Always a two-column split at lg+ (design/freebiz-mockup.html's
            .split, data-screen="v-watch") — board/apply/stats on the left,
            the feed cards on the right, for every viewer, not just guests.
            Previously this only split for guests, and the stat grid sat
            above the board spanning the full width — on a laptop/tablet
            viewport that pushed the video below the fold, forcing a scroll
            to see the rest of it even though the mockup's own layout never
            does that (its stat grid sits *below* the apply box, sized to
            the left column only). Fixed by matching the mockup's actual
            structure instead of the guess this screen was built from. */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-4 items-start">
          <div className="space-y-4 min-w-0">
            {/* The board — strip, screenface, and playing bar together as
                one frame, matching design/freebiz-mockup.html's .board. */}
            <div
              className="rounded-2xl p-2"
              style={{
                background: "var(--ink-800)",
                border: "1px solid var(--line)",
                boxShadow: "var(--shadow)",
              }}>
              <div className="rounded-lg overflow-hidden mb-2">
                <PerimeterStrip items={stripFeed.data?.items ?? []} />
              </div>

              {!current ? (
                <div
                  className="flex items-center justify-center py-24 aspect-video rounded-lg"
                  style={{
                    color: "var(--muted)",
                    background: "var(--ink-900)",
                  }}>
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Loading the billboard...
                </div>
              ) : current.type === "FREEBIE" ? (
                <FreebieTakeover
                  key={current.slotId}
                  publicCode={current.publicCode ?? ""}
                  valueLabel={current.valueLabel}
                  durationSec={current.durationSec}
                  onEnded={handleEnded}
                  onTimeUpdate={handleTimeUpdate}
                  onClaim={handleClaimFromTakeover}
                />
              ) : (
                <BannerPlayer
                  key={current.slotId}
                  src={current.bannerImageUrl}
                  durationSec={current.durationSec}
                  brandLabel={brandLabel}
                  title={current.title}
                  onEnded={handleEnded}
                  onTimeUpdate={handleTimeUpdate}
                  clickUrl={current.type === "AD" ? current.clickUrl : undefined}
                  onClickThrough={handleClickThrough}
                />
              )}
            </div>

            <Card>
              <div ref={applyBoxRef}>
                <ApplyBox initialCode={prefillCode} />
              </div>
            </Card>
            <p className="text-xs px-1" style={{ color: "var(--faint)" }}>
              Applying returns a secret code only you can see. It credits your
              wallet — redeem as many as you win, no limit.
            </p>

            {/* design/freebiz-mockup.html's .grid.g4 — Codes today / Still
                unclaimed / Ads in rotation / Your streak, in that order,
                below the apply box rather than above the board. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Stat
                label="Codes today"
                value={boardStats.data?.codesToday ?? "—"}
              />
              <Stat
                label="Still unclaimed"
                value={unclaimedNow}
                valueColor="var(--live)"
                detail="Refreshed continuously"
              />
              <Stat
                label="Ads in rotation"
                value={boardStats.data?.adsInRotation ?? "—"}
              />
              {user && (
                <Stat
                  label="Your streak"
                  value={myStreak.data ?? "—"}
                  suffix={
                    myStreak.data
                      ? myStreak.data === 1
                        ? " day"
                        : " days"
                      : undefined
                  }
                  valueColor="var(--free)"
                />
              )}
            </div>
          </div>

          {/* Right column — matching the mockup's two-column .split
              (previously this whole column only rendered for guests, which
              is also what made the left column go full-width and push
              everything down the page for a logged-in viewer). Now always
              present — the sponsored-ad panel (2026-09-03) always has
              something to show, even if it's just its own placeholder. */}
          <div className="space-y-4">
            <SponsoredAdPanel ad={queueQuery.data?.sponsoredAd} onClick={handleSponsoredAdClick} />

            {recentCatches.data && recentCatches.data.length > 0 && (
              <Card>
                <h3
                  style={{
                    fontFamily: "var(--display)",
                    fontSize: 15,
                    color: "var(--txt)",
                  }}>
                  Recent catches
                </h3>
                <p className="fb-hint mt-0.5">Live feed — every claim on the board.</p>
                <ul className="mt-2.5 space-y-2">
                  {recentCatches.data.map((c, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between gap-3"
                      style={{ fontSize: 13 }}>
                      <span style={{ color: "var(--txt)" }}>
                        <b>{c.displayName}</b> caught {c.valueLabel}
                      </span>
                      <span className="fb-hint flex-shrink-0">
                        {new Date(c.takenAt).toLocaleTimeString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            {!user && (
              <Card
                style={{
                  borderColor: "rgba(255,210,63,.3)",
                  background:
                    "linear-gradient(150deg, rgba(255,210,63,.1), transparent 60%), var(--ink-800)",
                }}>
                <h3>You&apos;re watching as a guest</h3>
                <CardNote className="mt-1">
                  You can see everything. To take a code, you need an account —
                  it takes about 30 seconds.
                </CardNote>
                <Link href={routes.REGISTER} className="inline-block mt-3">
                  <Button variant="primary">Create account</Button>
                </Link>
              </Card>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
