"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, EyeOff, Loader2, ExternalLink } from "lucide-react";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Pill } from "@/components/ui/freebiz-pill";
import { Button } from "@/components/ui/freebiz-button";
import { Field } from "@/components/ui/freebiz-field";
import { Textarea } from "@/components/ui/freebiz-input";
import { PageLoader } from "@/components/ui/page-loader";
import { apiErrorMessage } from "@/app/_utils/helper";
import {
  useAdminForumFlags,
  useResolveForumFlag,
  useAdminWinnerSubmissions,
  useVerifyWinnerSubmission,
  useRejectWinnerSubmission,
} from "@/hooks/use-forum";

// New 2026-09-02. Two independent queues on one screen, matching how the
// user's own pasted admin inventory grouped "Forum moderation" as a single
// item ("flag queue, resolve flags, review winner-share submissions").
export default function AdminForumPage() {
  const { data: flags, isLoading: loadingFlags } = useAdminForumFlags("open");
  const resolveFlag = useResolveForumFlag();

  const { data: submissions, isLoading: loadingSubmissions } = useAdminWinnerSubmissions("submitted");
  const verifySubmission = useVerifyWinnerSubmission();
  const rejectSubmission = useRejectWinnerSubmission();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const handleResolve = (flagId: string, status: "resolved" | "dismissed", hidePost: boolean) => {
    resolveFlag.mutate(
      { flagId, status, hidePost },
      {
        onSuccess: () => toast.success(hidePost ? "Post hidden." : status === "resolved" ? "Flag resolved." : "Flag dismissed."),
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't resolve this flag.")),
      }
    );
  };

  const handleVerify = (id: string) => {
    verifySubmission.mutate(
      { id, adminNotes: notes[id]?.trim() || undefined },
      {
        onSuccess: () => toast.success("Verified — bonus points credited."),
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't verify this submission.")),
      }
    );
  };

  const handleReject = (id: string) => {
    if (!notes[id]?.trim()) {
      toast.error("A note is required to reject a submission.");
      return;
    }
    rejectSubmission.mutate(
      { id, adminNotes: notes[id].trim() },
      {
        onSuccess: () => toast.success("Rejected."),
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't reject this submission.")),
      }
    );
  };

  if (loadingFlags || loadingSubmissions) return <PageLoader withLayout={false} message="Loading forum moderation..." />;

  return (
    <div className="space-y-4">
      <div>
        <p style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)" }}>
          Admin / Forum moderation
        </p>
        <h1 className="mt-1" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
          Forum moderation
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <Card>
          <div className="flex items-center justify-between gap-2">
            <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Reported posts</h3>
            <Pill tone={flags && flags.length > 0 ? "bad" : "default"} dot>{flags?.length ?? 0} open</Pill>
          </div>
          {!flags || flags.length === 0 ? (
            <CardNote className="mt-3">Nothing flagged right now.</CardNote>
          ) : (
            <div className="mt-3 space-y-2">
              {flags.map((flag) => (
                <div key={flag._id} className="p-3 rounded-lg" style={{ background: "var(--ink-900)", border: "1px solid var(--line)" }}>
                  <p style={{ fontSize: 13, color: "var(--txt)" }}>{flag.reason}</p>
                  <p className="fb-hint mt-1">Post {flag.postId.slice(-8)} · {new Date(flag.createdAt).toLocaleDateString()}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button size="sm" variant="danger" disabled={resolveFlag.isPending} onClick={() => handleResolve(flag._id, "resolved", true)}>
                      <EyeOff className="h-3.5 w-3.5" /> Hide post
                    </Button>
                    <Button size="sm" variant="ghost" disabled={resolveFlag.isPending} onClick={() => handleResolve(flag._id, "dismissed", false)}>
                      Dismiss
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between gap-2">
            <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Winner-share submissions</h3>
            <Pill tone={submissions && submissions.length > 0 ? "warn" : "default"} dot>{submissions?.length ?? 0} pending</Pill>
          </div>
          {!submissions || submissions.length === 0 ? (
            <CardNote className="mt-3">Nothing pending review.</CardNote>
          ) : (
            <div className="mt-3 space-y-2">
              {submissions.map((s) => (
                <div key={s._id} className="p-3 rounded-lg" style={{ background: "var(--ink-900)", border: "1px solid var(--line)" }}>
                  <a href={s.postUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 truncate" style={{ fontSize: 13, color: "var(--accent)" }}>
                    {s.postUrl} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  </a>
                  <p className="fb-hint mt-1">
                    Campaign {s.campaignId.slice(-8)}
                    {s.claimedLikeCount !== undefined && ` · claims ${s.claimedLikeCount} likes (unverified)`}
                  </p>
                  <Field label="Note" className="mt-2">
                    <Textarea
                      rows={1}
                      value={notes[s._id] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [s._id]: e.target.value }))}
                      placeholder="Required to reject"
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2 mt-2">
                    <Button size="sm" variant="primary" disabled={verifySubmission.isPending} onClick={() => handleVerify(s._id)}>
                      {verifySubmission.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Verify
                    </Button>
                    <Button size="sm" variant="danger" disabled={rejectSubmission.isPending} onClick={() => handleReject(s._id)}>
                      {rejectSubmission.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
                      Reject
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
