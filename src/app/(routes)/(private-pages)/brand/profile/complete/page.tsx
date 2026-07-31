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
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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

  return (
    <MainLayout maxWidth="md">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <Sparkles className="h-8 w-8 text-primary mx-auto" />
          <h1 className="font-sora text-2xl font-bold text-foreground">
            Complete your brand profile
          </h1>
          <p className="text-sm text-muted-foreground">
            Required before you can create an ad campaign.
          </p>
        </div>

        <div className="space-y-1">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(fieldsDone / 5) * 100}%` }}
              data-testid="brand-profile-progress-bar"
            />
          </div>
          <p className="text-xs text-muted-foreground text-right" data-testid="brand-profile-progress-label">
            {fieldsDone} of 5 fields complete
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company name</FormLabel>
                  <FormControl>
                    <Input placeholder="Company name" {...field} />
                  </FormControl>
                  <FormMessage className="text-destructive text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="businessCategories"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Business categories</FormLabel>
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
                    <Button type="button" variant="outline" onClick={addCategory}>
                      Add
                    </Button>
                  </div>
                  {field.value.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {field.value.map((category) => (
                        <Badge
                          key={category}
                          variant="secondary"
                          className="flex items-center gap-1">
                          {category}
                          <button
                            type="button"
                            onClick={() => removeCategory(category)}
                            aria-label={`Remove ${category}`}>
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                  <FormMessage className="text-destructive text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <Input placeholder="Country" {...field} />
                  </FormControl>
                  <FormMessage className="text-destructive text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="state"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>State</FormLabel>
                  <FormControl>
                    <Input placeholder="State" {...field} />
                  </FormControl>
                  <FormMessage className="text-destructive text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>City</FormLabel>
                  <FormControl>
                    <Input placeholder="City" {...field} />
                  </FormControl>
                  <FormMessage className="text-destructive text-xs" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save & continue"
              )}
            </Button>
          </form>
        </Form>
      </div>
    </MainLayout>
  );
}

export default function BrandProfileCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <BrandProfileCompleteForm />
    </Suspense>
  );
}
