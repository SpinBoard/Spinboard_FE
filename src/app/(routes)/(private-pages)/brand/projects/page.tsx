"use client";

import Link from "next/link";
import { Plus, Briefcase, Search, ShieldAlert } from "lucide-react";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Button } from "@/components/ui/freebiz-button";
import { Pill } from "@/components/ui/freebiz-pill";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { routes } from "@/app/_utils/routes";
import { useMyProjects } from "@/hooks/use-projects";
import { useKycMe } from "@/hooks/use-kyc";
import { PROJECT_STATUS_TONE, formatProjectStatusLabel, formatBudgetRange } from "./project-status";

// New 2026-09-02 — B2B marketplace: this brand's own posted Projects.
// Posting a Project (and submitting a Quotation on someone else's,
// reachable from "Browse open projects" below) both require KYC
// verification — gated with a banner here rather than a silent disabled
// button, since KYC_REQUIRED is a 403 a brand should understand before
// they hit it. Verified live 2026-09-02: despite docs saying to read
// Brand.kycStatus off GET /profile/brand for this, that field is never
// actually populated there — GET /kyc/me is the only endpoint that
// reliably reflects the real status, so this reads that instead.
export default function BrandProjectsPage() {
  const { data: kyc } = useKycMe();
  const { data: projects, isLoading, error } = useMyProjects();

  const kycVerified = kyc?.status === "verified";

  if (isLoading) return <PageLoader withLayout={false} message="Loading your projects..." />;
  if (error) {
    return <PageError withLayout={false} title="Failed to Load Projects" message="Unable to load your projects. Please try again." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)" }}>
            Brands / Projects
          </p>
          <h1 className="mt-1" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
            Your projects
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Post a project and other verified businesses submit quotations on it.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={routes.BRAND.PROJECTS_BROWSE}>
            <Button variant="ghost"><Search className="h-4 w-4" /> Browse open projects</Button>
          </Link>
          <Link href={kycVerified ? routes.BRAND.PROJECTS_NEW : routes.BRAND.KYC}>
            <Button variant="primary"><Plus className="h-4 w-4" /> New project</Button>
          </Link>
        </div>
      </div>

      {!kycVerified && (
        <Card style={{ borderColor: "rgba(255,210,63,.35)", background: "rgba(255,210,63,.08)" }}>
          <div className="flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "var(--free)" }} />
            <div>
              <b style={{ fontSize: 13.5, color: "var(--txt)" }}>Verify your business to post a project</b>
              <p className="fb-hint mt-1">
                Posting a project and submitting a quotation both require KYC verification.{" "}
                <Link href={routes.BRAND.KYC} style={{ color: "var(--accent)" }}>Start verification</Link>
              </p>
            </div>
          </div>
        </Card>
      )}

      {!projects || projects.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <Briefcase className="h-8 w-8 mx-auto mb-3" style={{ color: "var(--faint)" }} />
            <CardNote>You haven&apos;t posted a project yet.</CardNote>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project._id} href={routes.BRAND.PROJECT_DETAILS(project._id)}>
              <Card tight className="h-full p-3.5 transition-colors hover:border-[var(--accent)]">
                <div className="flex items-center justify-between gap-2">
                  <Pill tone={PROJECT_STATUS_TONE[project.status]} dot>{formatProjectStatusLabel(project.status)}</Pill>
                  <span className="fb-hint">{project.quotationCount} quote{project.quotationCount !== 1 ? "s" : ""}</span>
                </div>
                <h3 className="mt-2" style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>{project.title}</h3>
                {formatBudgetRange(project.budgetMin, project.budgetMax, project.currency) && (
                  <p style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>
                    {formatBudgetRange(project.budgetMin, project.budgetMax, project.currency)}
                  </p>
                )}
                <p className="mt-1.5 line-clamp-2" style={{ fontSize: 12.5, color: "var(--muted)" }}>{project.description}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
