"use client";

import { Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAtom } from "jotai";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { isAxiosError } from "axios";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/freebiz-card";
import { Field } from "@/components/ui/freebiz-field";
import { Input } from "@/components/ui/freebiz-input";
import { Button } from "@/components/ui/freebiz-button";
import { Progress } from "@/components/ui/freebiz-progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { routes } from "@/app/_utils/routes";
import { userAtom } from "@/atom/user";

const profileCompletionSchema = z.object({
  age: z.number().int().min(13, "Must be at least 13").max(120, "Enter a valid age"),
  sex: z.enum(["man", "woman", "prefer_not_to_say"]),
  country: z.string().min(2, "Required"),
  state: z.string().min(2, "Required"),
  city: z.string().min(2, "Required"),
});

type ProfileCompletionValues = z.infer<typeof profileCompletionSchema>;

// RESTYLE (design/DECISIONS.md #7) — onboarding flow, kept exactly as-is:
// same fields, same validation, same submit behaviour. The "Sex" field
// keeps the existing shadcn Select rather than a native <select> — this
// page's own test suite drives it via the Radix combobox/listbox
// interaction pattern (getByRole("combobox") / getByRole("option")), which
// a native select doesn't produce the same way. Also drops "you're all set
// to spin" — a SpinBoard-era leftover phrase per CLAUDE.md's warning about
// stale copy; there's no spin wheel in this product.
function ProfileCompleteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || routes.WATCH;
  const [user, setUser] = useAtom(userAtom);

  const form = useForm<ProfileCompletionValues>({
    resolver: zodResolver(profileCompletionSchema),
    defaultValues: {
      age: 0,
      sex: undefined,
      country: "",
      state: "",
      city: "",
    },
  });

  const values = form.watch();
  const fieldsDone = useMemo(() => {
    let done = 0;
    if (values.age > 0) done++;
    if (values.sex) done++;
    if (values.country) done++;
    if (values.state) done++;
    if (values.city) done++;
    return done;
  }, [values]);

  const mutation = useMutation({
    mutationFn: (payload: ProfileCompletionValues) => api.put(ENDPOINTS.VIEWER_PROFILE, payload),
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error("Error", { description: message || "Couldn't save your profile" });
    },
    onSuccess: () => {
      if (user) setUser({ ...user, profileComplete: true });
      toast.success("Profile complete!", { description: "You're all set to catch freebie codes." });
      router.push(returnTo);
    },
  });

  const onSubmit = (values: ProfileCompletionValues) => mutation.mutate(values);
  const errors = form.formState.errors;

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--ink-900)" }}>
      <Card className="w-full max-w-md">
        <div className="text-center">
          <Sparkles className="h-7 w-7 mx-auto" style={{ color: "var(--accent)" }} />
          <h1 className="mt-2" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 21, color: "var(--txt)" }}>
            Complete your profile
          </h1>
          <p className="mt-1 fb-hint">
            A complete, verified profile is required to claim freebie codes. It only takes a minute.
          </p>
        </div>

        <div className="mt-4 space-y-1">
          <Progress value={(fieldsDone / 5) * 100} data-testid="profile-progress-bar" />
          <p className="fb-hint text-right" data-testid="profile-progress-label">
            {fieldsDone} of 5 fields complete
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-4 space-y-3">
          <Field label="Age" htmlFor="age">
            <Input
              id="age"
              type="number"
              placeholder="Age"
              {...form.register("age", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
            />
            {errors.age && <span className="fb-hint" style={{ color: "var(--spent)" }}>{errors.age.message}</span>}
          </Field>

          <Field label="Sex">
            <Select onValueChange={(v) => form.setValue("sex", v as ProfileCompletionValues["sex"], { shouldValidate: true })} value={form.watch("sex")}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="man">Man</SelectItem>
                <SelectItem value="woman">Woman</SelectItem>
                <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
            {errors.sex && <span className="fb-hint" style={{ color: "var(--spent)" }}>{errors.sex.message}</span>}
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

export default function ProfileCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ProfileCompleteForm />
    </Suspense>
  );
}
