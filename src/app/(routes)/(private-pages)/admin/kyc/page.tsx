"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, FileText, ExternalLink } from "lucide-react";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Pill } from "@/components/ui/freebiz-pill";
import { Button } from "@/components/ui/freebiz-button";
import { Field } from "@/components/ui/freebiz-field";
import { Textarea } from "@/components/ui/freebiz-input";
import { LimitRow } from "@/components/ui/freebiz-limit-row";
import { PageLoader } from "@/components/ui/page-loader";
import { useAdminKycQueue, useApproveKyc, useRejectKyc } from "@/hooks/use-kyc";
import { apiErrorMessage } from "@/app/_utils/helper";

// Admin review queue for Business KYC (new 2026-09-02). automatedCheck.result
// is a signal only — it never decides the outcome, a human always does via
// approve/reject. "match" is currently a rare outcome since Interswitch's
// real API isn't wired yet (docs/frontend/README.md); every submission
// still needs a real look regardless.
export default function AdminKycPage() {
  const { data: queue, isLoading, error } = useAdminKycQueue();
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  const approveMutation = useApproveKyc();
  const rejectMutation = useRejectKyc();

  const focused = (queue ?? []).find((k) => k._id === focusedId) ?? (queue ?? [])[0] ?? null;

  const handleApprove = (id: string) => {
    approveMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Verified.");
        setReason("");
      },
      onError: (err) => toast.error(apiErrorMessage(err, "Couldn't approve this submission.")),
    });
  };

  const handleReject = (id: string) => {
    if (!reason.trim()) {
      toast.error("A reason is required to reject a submission.");
      return;
    }
    rejectMutation.mutate(
      { id, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success("Rejected — the brand can resubmit.");
          setReason("");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't reject this submission.")),
      }
    );
  };

  if (isLoading) return <PageLoader withLayout={false} message="Loading KYC queue..." />;
  if (error) return <Card><CardNote>Failed to load the KYC queue. Please try again.</CardNote></Card>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)" }}>
            Admin / KYC review
          </p>
          <h1 className="mt-1" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
            Business verification queue
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Oldest submissions first. Every one needs a real decision — the automated pre-check is a
            signal, not an answer.
          </p>
        </div>
        <Pill tone={queue && queue.length > 0 ? "warn" : "default"} dot>{queue?.length ?? 0} pending</Pill>
      </div>

      {!queue || queue.length === 0 ? (
        <Card><CardNote>Nothing pending review right now.</CardNote></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
          <Card tight className="lg:max-h-[640px] lg:overflow-y-auto">
            <p className="fb-hint px-3 pt-2 pb-1">Queue ({queue.length})</p>
            <div>
              {queue.map((k) => (
                <div
                  key={k._id}
                  className="px-3 py-2.5 cursor-pointer"
                  style={{
                    borderTop: "1px solid var(--line)",
                    background: focused?._id === k._id ? "var(--accent-soft)" : undefined,
                  }}
                  onClick={() => setFocusedId(k._id)}>
                  <b style={{ fontSize: 13, color: "var(--txt)" }} className="block truncate">{k.legalBusinessName}</b>
                  <span className="fb-hint">{k.rcNumber} · attempt {k.attemptNumber}</span>
                </div>
              ))}
            </div>
          </Card>

          {focused && (
            <div className="space-y-4 min-w-0">
              <Card>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 style={{ fontFamily: "var(--display)", fontSize: 16, color: "var(--txt)" }}>{focused.legalBusinessName}</h3>
                    <p className="fb-hint mt-1">
                      Brand {focused.brandId} · submitted {new Date(focused.submittedAt).toLocaleString()}
                    </p>
                  </div>
                  <Pill
                    tone={
                      focused.automatedCheck.result === "match"
                        ? "live"
                        : focused.automatedCheck.result === "no_match"
                        ? "bad"
                        : "default"
                    }>
                    Automated: {focused.automatedCheck.result.replace(/_/g, " ")}
                  </Pill>
                </div>

                <div className="mt-3 pt-3 space-y-1" style={{ borderTop: "1px solid var(--line)" }}>
                  <LimitRow label="RC number" value={focused.rcNumber} />
                  {focused.businessType && <LimitRow label="Business type" value={focused.businessType} />}
                  {focused.documents?.repIdType && <LimitRow label="Rep ID type" value={focused.documents.repIdType} />}
                  <LimitRow label="Attempt" value={focused.attemptNumber} />
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {focused.documents?.cacCertificateUrl ? (
                    <a href={focused.documents.cacCertificateUrl} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="ghost"><FileText className="h-3.5 w-3.5" /> CAC certificate <ExternalLink className="h-3 w-3" /></Button>
                    </a>
                  ) : (
                    <span className="fb-hint">No CAC certificate uploaded</span>
                  )}
                  {focused.documents?.repIdUrl && (
                    <a href={focused.documents.repIdUrl} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="ghost"><FileText className="h-3.5 w-3.5" /> Representative ID <ExternalLink className="h-3 w-3" /></Button>
                    </a>
                  )}
                </div>
              </Card>

              <Card>
                <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Decision</h3>
                <Field label="Rejection reason (required to reject)" className="mt-2">
                  <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="e.g. Document doesn't match legal business name" />
                </Field>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button variant="primary" disabled={approveMutation.isPending} onClick={() => handleApprove(focused._id)}>
                    {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Approve
                  </Button>
                  <Button variant="danger" disabled={rejectMutation.isPending} onClick={() => handleReject(focused._id)}>
                    {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                    Reject
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
