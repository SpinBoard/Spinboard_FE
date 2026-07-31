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
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
    mutationFn: (payload: ProfileCompletionValues) => api.put(ENDPOINTS.GAMER_PROFILE, payload),
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error("Error", { description: message || "Couldn't save your profile" });
    },
    onSuccess: () => {
      if (user) setUser({ ...user, profileComplete: true });
      toast.success("Profile complete!", { description: "You're all set to spin." });
      router.push(returnTo);
    },
  });

  const onSubmit = (values: ProfileCompletionValues) => mutation.mutate(values);

  return (
    <MainLayout maxWidth="md">
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <Sparkles className="h-8 w-8 text-primary mx-auto" />
          <h1 className="font-sora text-2xl font-bold text-foreground">
            Complete your profile
          </h1>
          <p className="text-sm text-muted-foreground">
            A complete, verified profile is required to spin. It only takes a minute.
          </p>
        </div>

        <div className="space-y-1">
          <div className="h-2 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(fieldsDone / 5) * 100}%` }}
              data-testid="profile-progress-bar"
            />
          </div>
          <p className="text-xs text-muted-foreground text-right" data-testid="profile-progress-label">
            {fieldsDone} of 5 fields complete
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="age"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Age</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="Age"
                      value={field.value || ""}
                      onChange={(e) =>
                        field.onChange(e.target.value === "" ? 0 : Number(e.target.value))
                      }
                    />
                  </FormControl>
                  <FormMessage className="text-destructive text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sex"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sex</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="man">Man</SelectItem>
                      <SelectItem value="woman">Woman</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
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

export default function ProfileCompletePage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <ProfileCompleteForm />
    </Suspense>
  );
}
