"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAtomValue } from "jotai";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Lock, Loader2, MessageSquare, XCircle, CheckCircle2, Paperclip } from "lucide-react";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Button } from "@/components/ui/freebiz-button";
import { Pill } from "@/components/ui/freebiz-pill";
import { Field } from "@/components/ui/freebiz-field";
import { Input, Textarea } from "@/components/ui/freebiz-input";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { userAtom } from "@/atom/user";
import { routes } from "@/app/_utils/routes";
import { apiErrorCode, apiErrorMessage } from "@/app/_utils/helper";
import {
  useProject,
  useCloseProject,
  useCancelProject,
  useProjectQuotations,
  useCreateQuotation,
  useWithdrawQuotation,
  useQuotationUnlockStatus,
  usePurchaseQuotationUnlock,
} from "@/hooks/use-projects";
import { useCreateContactThread } from "@/hooks/use-business-contact";
import { Quotation } from "@/types";
import { PROJECT_STATUS_TONE, QUOTATION_STATUS_TONE, formatProjectStatusLabel, formatBudgetRange } from "../project-status";

// New 2026-09-02 — B2B marketplace project detail. Doubles as two screens
// depending on who's looking: the poster manages it (close/cancel, view
// quotations behind the free-1/unlock-the-rest paywall) while any other
// KYC-verified brand sees a quote form instead. `GET /projects/:id/quotations`
// is poster-only (the paywall) — a quoting brand currently has no
// documented way to fetch back their own submitted quotation on a later
// visit, so its status/withdraw action is only shown for the quotation
// just created in this session (see `justQuoted` below), not persisted.
export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const user = useAtomValue(userAtom);

  const { data: project, isLoading, error } = useProject(projectId);
  const isOwner = !!user && !!project && user.id === project.brandId;

  const closeProject = useCloseProject();
  const cancelProject = useCancelProject();

  const { data: quotationsData, isLoading: loadingQuotations } = useProjectQuotations(isOwner ? projectId : null);
  const { data: unlockStatus } = useQuotationUnlockStatus();
  const purchaseUnlock = usePurchaseQuotationUnlock();

  const createThread = useCreateContactThread();

  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");
  const createQuotation = useCreateQuotation(projectId);
  const withdrawQuotation = useWithdrawQuotation();
  const [justQuoted, setJustQuoted] = useState<Quotation | null>(null);

  if (isLoading) return <PageLoader withLayout={false} message="Loading project..." />;
  if (error || !project) {
    return <PageError withLayout={false} title="Project Not Found" message="This project could not be found." />;
  }

  const handleOpenThread = (quotationId: string) => {
    createThread.mutate(
      { projectId, quotationId },
      {
        onSuccess: () => {
          toast.success("Contact thread opened.");
          router.push(routes.BRAND.MESSAGES);
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't open a contact thread.")),
      }
    );
  };

  const handleSubmitQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0 || !message.trim()) {
      toast.error("A valid amount and message are required.");
      return;
    }
    createQuotation.mutate(
      { amount: numericAmount, message: message.trim() },
      {
        onSuccess: (quotation) => {
          toast.success("Quotation submitted.");
          setJustQuoted(quotation);
          setAmount("");
          setMessage("");
        },
        onError: (err) => {
          const code = apiErrorCode(err);
          if (code === "KYC_REQUIRED") {
            toast.error("Verify your business before submitting a quotation.");
            return;
          }
          toast.error(apiErrorMessage(err, "Couldn't submit your quotation."));
        },
      }
    );
  };

  const handleWithdraw = () => {
    if (!justQuoted) return;
    withdrawQuotation.mutate(
      { quotationId: justQuoted._id, projectId },
      {
        onSuccess: () => {
          toast.success("Quotation withdrawn.");
          setJustQuoted({ ...justQuoted, status: "withdrawn" });
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't withdraw this quotation.")),
      }
    );
  };

  const handlePurchaseUnlock = () => {
    purchaseUnlock.mutate(undefined, {
      onSuccess: (data) => toast.success(`Unlocked — valid until ${new Date(data.expiresAt).toLocaleDateString()}.`),
      onError: (err) => {
        const code = apiErrorCode(err);
        if (code === "INSUFFICIENT_BALANCE") {
          toast.error("Insufficient wallet balance — top up first.");
          return;
        }
        toast.error(apiErrorMessage(err, "Couldn't purchase the unlock pass."));
      },
    });
  };

  const hiddenCount = quotationsData ? quotationsData.totalQuotationCount - quotationsData.quotations.length : 0;

  return (
    <div className="space-y-4 max-w-3xl">
      <Link href={isOwner ? routes.BRAND.PROJECTS : routes.BRAND.PROJECTS_BROWSE}>
        <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Back</Button>
      </Link>

      <Card>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 22, color: "var(--txt)" }}>{project.title}</h1>
            <p className="fb-hint mt-1">Posted {new Date(project.createdAt).toLocaleDateString()}</p>
          </div>
          <Pill tone={PROJECT_STATUS_TONE[project.status]} dot>{formatProjectStatusLabel(project.status)}</Pill>
        </div>
        <p className="mt-3" style={{ color: "var(--muted)", fontSize: 13.5, whiteSpace: "pre-wrap" }}>{project.description}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {formatBudgetRange(project.budgetMin, project.budgetMax, project.currency) && (
            <Pill tone="brandish">{formatBudgetRange(project.budgetMin, project.budgetMax, project.currency)}</Pill>
          )}
          {project.category && <Pill><span style={{ textTransform: "capitalize" }}>{project.category}</span></Pill>}
          {project.deadline && <Pill>Deadline {new Date(project.deadline).toLocaleDateString()}</Pill>}
        </div>

        {isOwner && project.status === "open" && (
          <div className="mt-4 pt-4 flex flex-wrap gap-2" style={{ borderTop: "1px solid var(--line)" }}>
            <Button variant="ghost" disabled={closeProject.isPending} onClick={() => closeProject.mutate(projectId)}>
              {closeProject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Close project
            </Button>
            <Button variant="danger" disabled={cancelProject.isPending} onClick={() => cancelProject.mutate(projectId)}>
              {cancelProject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Cancel project
            </Button>
          </div>
        )}
      </Card>

      {isOwner ? (
        <Card>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>
              Quotations ({quotationsData?.totalQuotationCount ?? project.quotationCount})
            </h3>
            {unlockStatus && (
              <Pill tone={unlockStatus.active ? "live" : "default"} dot>
                {unlockStatus.active
                  ? `Unlock pass active until ${new Date(unlockStatus.expiresAt!).toLocaleDateString()}`
                  : "No active unlock pass"}
              </Pill>
            )}
          </div>

          {loadingQuotations ? (
            <Loader2 className="h-4 w-4 animate-spin mt-3" style={{ color: "var(--muted)" }} />
          ) : !quotationsData || quotationsData.quotations.length === 0 ? (
            <CardNote className="mt-3">No quotations yet.</CardNote>
          ) : (
            <div className="mt-3 space-y-2">
              {quotationsData.quotations.map((q) => (
                <div key={q._id} className="p-3 rounded-lg" style={{ background: "var(--ink-900)", border: "1px solid var(--line)" }}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <b style={{ fontFamily: "var(--mono)", fontSize: 14, color: "var(--txt)" }}>
                      {q.currency === "NGN" ? "₦" : `${q.currency} `}{q.amount.toLocaleString()}
                    </b>
                    <Pill tone={QUOTATION_STATUS_TONE[q.status]} dot>{q.status === "submitted" ? "Active" : "Withdrawn"}</Pill>
                  </div>
                  <p className="mt-1.5" style={{ fontSize: 13, color: "var(--muted)" }}>{q.message}</p>
                  {!!q.attachmentUrls?.length && (
                    <div className="flex flex-wrap gap-2 mt-1.5">
                      {q.attachmentUrls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noreferrer" className="flex items-center gap-1 fb-hint" style={{ color: "var(--accent)" }}>
                          <Paperclip className="h-3 w-3" /> Attachment {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                  {q.status === "submitted" && (
                    <Button size="sm" variant="ghost" className="mt-2" disabled={createThread.isPending} onClick={() => handleOpenThread(q._id)}>
                      {createThread.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageSquare className="h-3.5 w-3.5" />}
                      Contact
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}

          {hiddenCount > 0 && (
            <div className="mt-3 p-3 rounded-lg flex items-center justify-between gap-3 flex-wrap" style={{ background: "rgba(255,210,63,.08)", border: "1px solid var(--free)" }}>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4" style={{ color: "var(--free)" }} />
                <span style={{ fontSize: 13, color: "var(--txt)" }}>{hiddenCount} more quotation{hiddenCount !== 1 ? "s" : ""} hidden</span>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="primary" disabled={purchaseUnlock.isPending} onClick={handlePurchaseUnlock}>
                  {purchaseUnlock.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Unlock all"}
                </Button>
                <Link href={routes.BRAND.WALLET}><Button size="sm" variant="ghost">Top up wallet</Button></Link>
              </div>
            </div>
          )}
        </Card>
      ) : (
        <Card>
          <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Submit a quotation</h3>

          {project.status !== "open" ? (
            <CardNote className="mt-2">This project isn&apos;t accepting quotations right now.</CardNote>
          ) : justQuoted ? (
            <div className="mt-3 p-3 rounded-lg" style={{ background: "var(--ink-900)", border: "1px solid var(--line)" }}>
              <div className="flex items-center justify-between gap-2">
                <b style={{ fontFamily: "var(--mono)", fontSize: 14, color: "var(--txt)" }}>
                  {justQuoted.currency === "NGN" ? "₦" : `${justQuoted.currency} `}{justQuoted.amount.toLocaleString()}
                </b>
                <Pill tone={QUOTATION_STATUS_TONE[justQuoted.status]} dot>{justQuoted.status === "submitted" ? "Active" : "Withdrawn"}</Pill>
              </div>
              <p className="mt-1.5" style={{ fontSize: 13, color: "var(--muted)" }}>{justQuoted.message}</p>
              {justQuoted.status === "submitted" && (
                <Button size="sm" variant="ghost" className="mt-2" disabled={withdrawQuotation.isPending} onClick={handleWithdraw}>
                  {withdrawQuotation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Withdraw"}
                </Button>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmitQuotation} className="mt-3 space-y-3">
              <Field label={`Your quote (${project.currency})`} htmlFor="amount">
                <Input id="amount" type="number" min="0" placeholder="e.g. 850000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </Field>
              <Field label="Message" htmlFor="message">
                <Textarea id="message" rows={4} placeholder="What's included, timeline, etc." value={message} onChange={(e) => setMessage(e.target.value)} required />
              </Field>
              <Button type="submit" variant="primary" className="w-full justify-center" disabled={createQuotation.isPending}>
                {createQuotation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit quotation"}
              </Button>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
