"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Briefcase, Loader2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Card } from "@/components/ui/freebiz-card";
import { Field } from "@/components/ui/freebiz-field";
import { Input, Textarea } from "@/components/ui/freebiz-input";
import { Button } from "@/components/ui/freebiz-button";
import { routes } from "@/app/_utils/routes";
import { apiErrorMessage } from "@/app/_utils/helper";
import { useCreateProject } from "@/hooks/use-projects";

const projectSchema = z
  .object({
    title: z.string().min(3, "Title must be at least 3 characters"),
    description: z.string().min(10, "Description must be at least 10 characters"),
    category: z.string().optional(),
    budgetMin: z.string().optional(),
    budgetMax: z.string().optional(),
    deadline: z.string().optional(),
  })
  .refine(
    (v) => !v.budgetMin || !v.budgetMax || Number(v.budgetMin) <= Number(v.budgetMax),
    { message: "Minimum budget can't exceed the maximum", path: ["budgetMax"] }
  );

type ProjectFormValues = z.infer<typeof projectSchema>;

// New 2026-09-02 — B2B marketplace. POST /projects requires
// Brand.kycStatus === "verified" (403 KYC_REQUIRED otherwise) — the
// listing page already gates the "New project" link behind that, so
// reaching this form at all implies verification, but the 403 is still
// handled here defensively in case status changed between page loads.
export default function NewProjectPage() {
  const router = useRouter();
  const createProject = useCreateProject();

  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectSchema),
    defaultValues: { title: "", description: "", category: "", budgetMin: "", budgetMax: "", deadline: "" },
  });
  const errors = form.formState.errors;

  const onSubmit = (values: ProjectFormValues) => {
    createProject.mutate(
      {
        title: values.title,
        description: values.description,
        category: values.category?.trim() || undefined,
        budgetMin: values.budgetMin ? Number(values.budgetMin) : undefined,
        budgetMax: values.budgetMax ? Number(values.budgetMax) : undefined,
        deadline: values.deadline || undefined,
      },
      {
        onSuccess: (project) => {
          toast.success("Project posted.");
          router.push(routes.BRAND.PROJECT_DETAILS(project._id));
        },
        onError: (error) => {
          toast.error(apiErrorMessage(error, "Failed to post project"));
        },
      }
    );
  };

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href={routes.BRAND.PROJECTS}>
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 22, color: "var(--txt)" }}>New project</h1>
          <p className="fb-hint mt-0.5">Post what you need — verified businesses can submit quotations</p>
        </div>
      </div>

      <Card>
        <h3 className="flex items-center gap-2" style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>
          <Briefcase className="h-4 w-4" style={{ color: "var(--accent)" }} />
          Project details
        </h3>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-3">
          <Field label="Title" htmlFor="title">
            <Input id="title" placeholder="e.g. Office fit-out for a 40-seat floor" {...form.register("title")} />
            {errors.title && <span className="fb-hint" style={{ color: "var(--spent)" }}>{errors.title.message}</span>}
          </Field>

          <Field label="Description" htmlFor="description">
            <Textarea id="description" rows={5} placeholder="Describe what you need in detail..." {...form.register("description")} />
            {errors.description && <span className="fb-hint" style={{ color: "var(--spent)" }}>{errors.description.message}</span>}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Budget min (₦, optional)" htmlFor="budgetMin">
              <Input id="budgetMin" type="number" min="0" placeholder="e.g. 500000" {...form.register("budgetMin")} />
            </Field>
            <Field label="Budget max (₦, optional)" htmlFor="budgetMax">
              <Input id="budgetMax" type="number" min="0" placeholder="e.g. 2000000" {...form.register("budgetMax")} />
              {errors.budgetMax && <span className="fb-hint" style={{ color: "var(--spent)" }}>{errors.budgetMax.message}</span>}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category (optional)" htmlFor="category">
              <Input id="category" placeholder="e.g. Construction" {...form.register("category")} />
            </Field>
            <Field label="Deadline (optional)" htmlFor="deadline">
              <Input id="deadline" type="date" {...form.register("deadline")} />
            </Field>
          </div>

          <Button type="submit" variant="primary" className="w-full justify-center" disabled={createProject.isPending}>
            {createProject.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post project"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
