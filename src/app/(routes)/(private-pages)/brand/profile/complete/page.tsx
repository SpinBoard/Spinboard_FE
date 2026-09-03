"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAtom } from "jotai";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/freebiz-card";
import { Field } from "@/components/ui/freebiz-field";
import { Input } from "@/components/ui/freebiz-input";
import { Button } from "@/components/ui/freebiz-button";
import { Pill } from "@/components/ui/freebiz-pill";
import { Progress } from "@/components/ui/freebiz-progress";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { routes } from "@/app/_utils/routes";
import { userAtom } from "@/atom/user";

const brandProfileCompletionSchema = z.object({
  companyName: z.string().min(2, "Required"),
  businessCategories: z.array(z.string()).min(1, "Add at least one category"),
  country: z.string().min(2, "Required"),
  state: z.string().min(2, "Required"),
  city: z.string().min(2, "Required"),
});

type BrandProfileCompletionValues = z.infer<typeof brandProfileCompletionSchema>;

// RESTYLE (design/DECISIONS.md #21) — onboarding flow, kept exactly as-is
// per the standing rule for these screens: same fields, same validation,
// same submit behaviour. Centered on the ink background like the auth
// screens (#26-30), since this is the same kind of "first thing a brand
// sees before they can do anything" flow.
function BrandProfileCompleteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || routes.BRAND.CAMPAIGNS_CREATE;
  const [user, setUser] = useAtom(userAtom);
  const [categoryDraft, setCategoryDraft] = useState("");

  const form = useForm<BrandProfileCompletionValues>({
    resolver: zodResolver(brandProfileCompletionSchema),
    defaultValues: {
      companyName: user?.companyName || "",
      businessCategories: [],
      country: "",
      state: "",
      city: "",
    },
  });

  const values = form.watch();
  const fieldsDone = useMemo(() => {
    let done = 0;
    if (values.companyName) done++;
    if (values.businessCategories?.length) done++;
    if (values.country) done++;
    if (values.state) done++;
    if (values.city) done++;
    return done;
  }, [values]);

  const mutation = useMutation({
    mutationFn: (payload: BrandProfileCompletionValues) =>
      api.put(ENDPOINTS.BRAND_PROFILE, payload),
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error("Error", { description: message || "Couldn't save your profile" });
    },
    onSuccess: () => {
      if (user) setUser({ ...user, profileComplete: true });
      toast.success("Profile complete!", {
        description: "You can now create ad campaigns.",
      });
      router.push(returnTo);
    },
  });

  const onSubmit = (values: BrandProfileCompletionValues) => mutation.mutate(values);

  const addCategory = () => {
    const trimmed = categoryDraft.trim();
    if (!trimmed) return;
    const current = form.getValues("businessCategories");
    if (!current.includes(trimmed)) {
      form.setValue("businessCategories", [...current, trimmed], { shouldValidate: true });
    }
    setCategoryDraft("");
  };

  const removeCategory = (category: string) => {
    form.setValue(
      "businessCategories",
      form.getValues("businessCategories").filter((c) => c !== category),
      { shouldValidate: true }
    );
  };

  const errors = form.formState.errors;
  const categories = form.watch("businessCategories");

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--ink-900)" }}>
      <Card className="w-full max-w-md">
        <div className="text-center">
          <Sparkles className="h-7 w-7 mx-auto" style={{ color: "var(--accent)" }} />
          <h1 className="mt-2" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 21, color: "var(--txt)" }}>
            Complete your brand profile
          </h1>
          <p className="mt-1 fb-hint">Required before you can create an ad campaign.</p>
        </div>

        <div className="mt-4 space-y-1">
          <Progress value={(fieldsDone / 5) * 100} data-testid="brand-profile-progress-bar" />
          <p className="fb-hint text-right" data-testid="brand-profile-progress-label">
            {fieldsDone} of 5 fields complete
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-3">
          <Field label="Company name" htmlFor="companyName">
            <Input id="companyName" placeholder="Company name" {...form.register("companyName")} />
            {errors.companyName && <span className="fb-hint" style={{ color: "var(--spent)" }}>{errors.companyName.message}</span>}
          </Field>

          <Field label="Business categories">
            <div className="flex gap-2">
              <Input
                placeholder="e.g. Fashion, Tech"
                value={categoryDraft}
                onChange={(e) => setCategoryDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory();
                  }
                }}
              />
              <Button type="button" variant="ghost" onClick={addCategory}>Add</Button>
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {categories.map((category) => (
                  <Pill key={category}>
                    {category}
                    <button type="button" onClick={() => removeCategory(category)} aria-label={`Remove ${category}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </Pill>
                ))}
              </div>
            )}
            {errors.businessCategories && <span className="fb-hint" style={{ color: "var(--spent)" }}>{errors.businessCategories.message}</span>}
          </Field>

          <Field label="Country" htmlFor="country">
            <Input id="country" placeholder="Country" {...form.register("country")} />
            {errors.country && <span className="fb-hint" style={{ color: "var(--spent)" }}>{errors.country.message}</span>}
          </Field>

          <Field label="State" htmlFor="state">
            <Input id="state" placeholder="State" {...form.register("state")} />
            {errors.state && <span className="fb-hint" style={{ color: "var(--spent)" }}>{errors.state.message}</span>}
          </Field>

          <Field label="City" htmlFor="city">
            <Input id="city" placeholder="City" {...form.register("city")} />
            {errors.city && <span className="fb-hint" style={{ color: "var(--spent)" }}>{errors.city.message}</span>}
          </Field>

          <Button type="submit" variant="primary" className="w-full justify-center" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & continue"}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function BrandProfileCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <BrandProfileCompleteForm />
    </Suspense>
  );
}
