"use client";

import Link from "next/link";
import { ArrowLeft, Search as SearchIcon } from "lucide-react";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Button } from "@/components/ui/freebiz-button";
import { Pill } from "@/components/ui/freebiz-pill";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { routes } from "@/app/_utils/routes";
import { useBrowseProjects } from "@/hooks/use-projects";
import { PROJECT_STATUS_TONE, formatProjectStatusLabel, formatBudgetRange } from "../project-status";

// GET /projects — open projects posted by other KYC-verified businesses.
// Submitting a quotation from a project's detail page still requires this
// brand's own KYC to be verified (403 KYC_REQUIRED otherwise) — that gate
// is enforced on the detail page, not here, since browsing itself doesn't
// need it.
export default function BrowseProjectsPage() {
  const { data: projects, isLoading, error } = useBrowseProjects();

  if (isLoading) return <PageLoader withLayout={false} message="Loading open projects..." />;
  if (error) {
    return <PageError withLayout={false} title="Failed to Load Projects" message="Unable to load open projects. Please try again." />;
  }

  return (
    <div className="space-y-4">
      <Link href={routes.BRAND.PROJECTS}>
        <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> Back to your projects</Button>
      </Link>

      <div>
        <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
          Open projects
        </h1>
        <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
          Submit a quotation on a project posted by another business.
        </p>
      </div>

      {!projects || projects.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <SearchIcon className="h-8 w-8 mx-auto mb-3" style={{ color: "var(--faint)" }} />
            <CardNote>No open projects right now — check back later.</CardNote>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link key={project._id} href={routes.BRAND.PROJECT_DETAILS(project._id)}>
              <Card tight className="h-full p-3.5 transition-colors hover:border-[var(--accent)]">
                <div className="flex items-center justify-between gap-2">
                  <Pill tone={PROJECT_STATUS_TONE[project.status]} dot>{formatProjectStatusLabel(project.status)}</Pill>
                  {project.category && <Pill><span style={{ textTransform: "capitalize" }}>{project.category}</span></Pill>}
                </div>
                <h3 className="mt-2" style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>{project.title}</h3>
                {formatBudgetRange(project.budgetMin, project.budgetMax, project.currency) && (
                  <p style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>
                    {formatBudgetRange(project.budgetMin, project.budgetMax, project.currency)}
                  </p>
                )}
                <p className="mt-1.5 line-clamp-2" style={{ fontSize: 12.5, color: "var(--muted)" }}>{project.description}</p>
                {project.deadline && (
                  <p className="fb-hint mt-1.5">Deadline: {new Date(project.deadline).toLocaleDateString()}</p>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
