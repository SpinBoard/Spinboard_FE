"use client";

import { useState } from "react";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { Award, Loader2 } from "lucide-react";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Button } from "@/components/ui/freebiz-button";
import { Pill } from "@/components/ui/freebiz-pill";
import { Field } from "@/components/ui/freebiz-field";
import { Input } from "@/components/ui/freebiz-input";
import { PageLoader } from "@/components/ui/page-loader";
import { userAtom } from "@/atom/user";
import { apiErrorMessage } from "@/app/_utils/helper";
import { useMyWinnerSubmissions, useSubmitWinnerShare } from "@/hooks/use-forum";
import { usePromoteLinksMine } from "@/hooks/use-promote";

const STATUS_TONE = { submitted: "warn", verified: "live", rejected: "bad" } as const;

// New 2026-09-02 — self-report a public share of a Promote & Earn campaign
// for a bonus-points review (forum winner-submissions). campaignId isn't
// explicitly typed in the docs; built against the inferred reading that
// this is a PromoCampaign._id (the only "share something publicly"
// mechanic in this product) — picking from the viewer's own shared
// campaigns (GET /promote/links/mine) rather than a free-text id field.
export default function WinnerSubmissionsPage() {
  const user = useAtomValue(userAtom);
  const { data: submissions, isLoading } = useMyWinnerSubmissions();
  const { data: links, isLoading: loadingLinks } = usePromoteLinksMine(!!user?.accessToken);
  const submitShare = useSubmitWinnerShare();

  const [campaignId, setCampaignId] = useState("");
  const [postUrl, setPostUrl] = useState("");
  const [claimedLikeCount, setClaimedLikeCount] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignId || !postUrl.trim()) {
      toast.error("Pick a campaign and paste your post's URL.");
      return;
    }
    submitShare.mutate(
      {
        campaignId,
        postUrl: postUrl.trim(),
        claimedLikeCount: claimedLikeCount ? Number(claimedLikeCount) : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Submitted for review.");
          setCampaignId("");
          setPostUrl("");
          setClaimedLikeCount("");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't submit this share.")),
      }
    );
  };

  if (isLoading) return <PageLoader withLayout={false} message="Loading your submissions..." />;

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <p style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)" }}>
          Viewers / Winner submissions
        </p>
        <h1 className="mt-1" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
          Claim your bonus
        </h1>
        <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
          Shared a Promote &amp; Earn campaign publicly? Link your post here for a bonus-points review.
        </p>
      </div>

      <Card>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Submit a share</h3>
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <Field label="Campaign">
            <select className="fb-input" value={campaignId} onChange={(e) => setCampaignId(e.target.value)} disabled={loadingLinks}>
              <option value="">{loadingLinks ? "Loading..." : "Select a campaign you've shared..."}</option>
              {links?.map((link) => (
                <option key={link.linkId} value={link.campaignId}>{link.campaign?.title ?? link.campaignId}</option>
              ))}
            </select>
          </Field>
          <Field label="Link to your public post" htmlFor="postUrl">
            <Input id="postUrl" type="url" placeholder="https://..." value={postUrl} onChange={(e) => setPostUrl(e.target.value)} required />
          </Field>
          <Field label="Likes on your post (optional, self-reported)" htmlFor="claimedLikeCount">
            <Input id="claimedLikeCount" type="number" min="0" value={claimedLikeCount} onChange={(e) => setClaimedLikeCount(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" className="w-full justify-center" disabled={submitShare.isPending}>
            {submitShare.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit for review"}
          </Button>
        </form>
      </Card>

      <Card>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Your submissions</h3>
        {!submissions || submissions.length === 0 ? (
          <div className="text-center py-8">
            <Award className="h-8 w-8 mx-auto mb-3" style={{ color: "var(--faint)" }} />
            <CardNote>No submissions yet.</CardNote>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {submissions.map((s) => (
              <div key={s._id} className="p-3 rounded-lg" style={{ background: "var(--ink-900)", border: "1px solid var(--line)" }}>
                <div className="flex items-center justify-between gap-2">
                  <a href={s.postUrl} target="_blank" rel="noreferrer" className="truncate" style={{ fontSize: 13, color: "var(--accent)" }}>
                    {s.postUrl}
                  </a>
                  <Pill tone={STATUS_TONE[s.status]} dot>{s.status}</Pill>
                </div>
                {s.status === "verified" && s.bonusPointsGranted !== undefined && (
                  <p className="fb-hint mt-1" style={{ color: "var(--live)" }}>+{s.bonusPointsGranted} bonus points</p>
                )}
                {s.status === "rejected" && s.adminNotes && (
                  <p className="fb-hint mt-1" style={{ color: "var(--spent)" }}>{s.adminNotes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
