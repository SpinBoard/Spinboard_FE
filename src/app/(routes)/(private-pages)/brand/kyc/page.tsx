"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, Clock, Upload, Loader2, FileText } from "lucide-react";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Pill } from "@/components/ui/freebiz-pill";
import { Button } from "@/components/ui/freebiz-button";
import { Field } from "@/components/ui/freebiz-field";
import { Input } from "@/components/ui/freebiz-input";
import { PageLoader } from "@/components/ui/page-loader";
import { useKycMe, useSubmitKyc, useResubmitKyc, KycSubmitPayload } from "@/hooks/use-kyc";
import { apiErrorMessage } from "@/app/_utils/helper";
import { KycBusinessType, KycRepIdType } from "@/types";

const BUSINESS_TYPES: { value: KycBusinessType; label: string }[] = [
  { value: "RC", label: "RC — Registered Company" },
  { value: "BN", label: "BN — Business Name" },
  { value: "IT", label: "IT — Incorporated Trustees" },
];

const REP_ID_TYPES: { value: KycRepIdType; label: string }[] = [
  { value: "NIN", label: "NIN" },
  { value: "drivers_license", label: "Driver's license" },
  { value: "passport", label: "International passport" },
  { value: "voters_card", label: "Voter's card" },
];

// New 2026-09-02 — brand-only. Required before a business can post a
// Project or submit a Quotation on the B2B marketplace. An automated CAC
// pre-check runs but never decides the outcome by itself — a human admin
// always makes the final call, so this screen never shows an
// instant-verified state right after submitting. Interswitch's real API
// isn't wired yet, so automatedCheck.result is "provider_error" on
// effectively every submission today — expected, not a bug
// (docs/frontend/README.md) — every submission still reaches the human
// queue regardless.
export default function BrandKycPage() {
  const { data: kyc, isLoading } = useKycMe();
  const submitKyc = useSubmitKyc();
  const resubmitKyc = useResubmitKyc();

  const [rcNumber, setRcNumber] = useState("");
  const [legalBusinessName, setLegalBusinessName] = useState("");
  const [businessType, setBusinessType] = useState<KycBusinessType | "">("");
  const [repIdType, setRepIdType] = useState<KycRepIdType | "">("");
  const [cacCertificate, setCacCertificate] = useState<File | null>(null);
  const [repId, setRepId] = useState<File | null>(null);

  if (isLoading) return <PageLoader withLayout={false} message="Loading verification status..." />;

  const status = kyc?.status ?? "not_submitted";
  const isSubmitting = submitKyc.isPending || resubmitKyc.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rcNumber.trim() || !legalBusinessName.trim()) {
      toast.error("RC number and legal business name are required.");
      return;
    }
    const payload: KycSubmitPayload = {
      rcNumber: rcNumber.trim(),
      legalBusinessName: legalBusinessName.trim(),
      businessType: businessType || undefined,
      repIdType: repIdType || undefined,
      cacCertificate: cacCertificate ?? undefined,
      repId: repId ?? undefined,
    };
    const mutation = status === "rejected" ? resubmitKyc : submitKyc;
    mutation.mutate(payload, {
      onSuccess: () => {
        toast.success("Submitted — a human reviewer will make the final call. This can take a little while.");
        setRcNumber("");
        setLegalBusinessName("");
        setBusinessType("");
        setRepIdType("");
        setCacCertificate(null);
        setRepId(null);
      },
      onError: (error) => toast.error(apiErrorMessage(error, "Couldn't submit your verification. Please try again.")),
    });
  };

  const showForm = status === "not_submitted" || status === "rejected" || status === "revoked";

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <p
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--faint)",
          }}>
          Brand / KYC verification
        </p>
        <h1 className="mt-1" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
          Business verification
        </h1>
        <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
          Verify your CAC registration to unlock posting projects and submitting quotations on the
          B2B marketplace.
        </p>
      </div>

      <Card>
        <div className="flex items-center gap-2">
          {status === "verified" && <Pill tone="live" dot><ShieldCheck className="h-3 w-3" /> Verified</Pill>}
          {status === "pending_review" && <Pill tone="warn" dot><Clock className="h-3 w-3" /> Pending review</Pill>}
          {status === "rejected" && <Pill tone="bad" dot><ShieldAlert className="h-3 w-3" /> Rejected</Pill>}
          {status === "revoked" && <Pill tone="bad" dot><ShieldAlert className="h-3 w-3" /> Revoked</Pill>}
          {status === "not_submitted" && <Pill tone="default">Not submitted</Pill>}
        </div>

        {status === "verified" && (
          <p className="mt-2" style={{ fontSize: 13.5, color: "var(--txt)" }}>
            Your business is verified. You can now post Projects and submit Quotations on the B2B
            marketplace.
          </p>
        )}
        {status === "pending_review" && (
          <p className="mt-2" style={{ fontSize: 13.5, color: "var(--txt)" }}>
            Submitted {kyc?.submittedAt ? new Date(kyc.submittedAt).toLocaleDateString() : ""} — a
            human reviewer always makes the final call here, so this can take a little while even
            though an automated pre-check already ran.
          </p>
        )}
        {status === "rejected" && kyc?.rejectionReason && (
          <p className="mt-2" style={{ fontSize: 13.5, color: "var(--spent)" }}>{kyc.rejectionReason}</p>
        )}
        {status === "revoked" && kyc?.revokedReason && (
          <p className="mt-2" style={{ fontSize: 13.5, color: "var(--spent)" }}>{kyc.revokedReason}</p>
        )}
      </Card>

      {showForm && (
        <Card>
          <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>
            {status === "rejected" ? "Resubmit verification" : "Submit for verification"}
          </h3>
          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            <Field label="RC number" htmlFor="rcNumber">
              <Input id="rcNumber" placeholder="e.g. RC1234567" value={rcNumber} onChange={(e) => setRcNumber(e.target.value)} required />
            </Field>
            <Field label="Legal business name" htmlFor="legalBusinessName">
              <Input
                id="legalBusinessName"
                placeholder="Exactly as registered with CAC"
                value={legalBusinessName}
                onChange={(e) => setLegalBusinessName(e.target.value)}
                required
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Business type (optional)" htmlFor="businessType">
                <select
                  id="businessType"
                  className="fb-input"
                  value={businessType}
                  onChange={(e) => setBusinessType(e.target.value as KycBusinessType | "")}>
                  <option value="">Select...</option>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Representative ID type (optional)" htmlFor="repIdType">
                <select
                  id="repIdType"
                  className="fb-input"
                  value={repIdType}
                  onChange={(e) => setRepIdType(e.target.value as KycRepIdType | "")}>
                  <option value="">Select...</option>
                  {REP_ID_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="CAC certificate (optional)">
              <label className="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer" style={{ border: "1px dashed var(--line-2)" }}>
                <Upload className="h-4 w-4 flex-shrink-0" style={{ color: "var(--faint)" }} />
                <span className="fb-hint truncate">{cacCertificate?.name ?? "Upload a file"}</span>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setCacCertificate(e.target.files?.[0] ?? null)} />
              </label>
            </Field>
            <Field label="Representative ID (optional)">
              <label className="flex items-center gap-2 p-2.5 rounded-lg cursor-pointer" style={{ border: "1px dashed var(--line-2)" }}>
                <FileText className="h-4 w-4 flex-shrink-0" style={{ color: "var(--faint)" }} />
                <span className="fb-hint truncate">{repId?.name ?? "Upload a file"}</span>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => setRepId(e.target.files?.[0] ?? null)} />
              </label>
            </Field>

            <Button type="submit" variant="primary" className="w-full justify-center" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : status === "rejected" ? "Resubmit" : "Submit for review"}
            </Button>
          </form>
        </Card>
      )}

      {status === "pending_review" && (
        <Card>
          <CardNote>
            No action needed right now — check back here for the outcome. You&apos;ll be able to
            resubmit if this gets rejected.
          </CardNote>
        </Card>
      )}
    </div>
  );
}
