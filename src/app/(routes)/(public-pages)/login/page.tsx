"use client";

import Link from "next/link";
import { routes } from "@/app/_utils/routes";
import { Suspense, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/freebiz-card";
import { Field } from "@/components/ui/freebiz-field";
import { Input } from "@/components/ui/freebiz-input";
import { Button } from "@/components/ui/freebiz-button";
import { LogoMark, Wordmark } from "@/components/shell/logo-mark";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { toast } from "sonner";
import { fetchUserDataForSession } from "@/app/_utils/auth-session";
import { useSetAtom, useAtomValue } from "jotai/react";
import { userAtom } from "@/atom/user";
import { useRouter, useSearchParams } from "next/navigation";
import GoogleAuthBtn from "@/components/auth/google-auth";

type LoginPayload = {
  email: string;
  password: string;
};

const loginSchema = z.object({
  email: z.email({ message: "Please enter a valid email address." }),
  password: z.string().min(8, { message: "Password must be at least 8 characters." }),
});

type LoginValues = z.infer<typeof loginSchema>;

// RESTYLE (design/DECISIONS.md #26-30) — "Center a Card on the ink
// background, one Field stack, one primary Button, the wordmark above.
// That's the whole design." The full site Header/Footer and the
// decorative blurred background blobs are dropped in favour of that
// minimal treatment; all auth logic (schema, mutation, redirect handling,
// Google auth) is unchanged.
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || undefined;
  const setUser = useSetAtom(userAtom);
  const user = useAtomValue(userAtom);
  const [showPassword, setShowPassword] = useState(false);

  // Viewers land on the billboard, not /user/dashboard — DECISIONS.md #6
  // parks that route ("the board is the viewer's home... remove from
  // nav") but the redirect targets sending every viewer there first were
  // never updated to match until now (2026-09-03).
  useEffect(() => {
    if (user) {
      router.push(
        user.userType === "viewer"
          ? routes.WATCH
          : user.userType === "admin"
            ? routes.ADMIN.CAMPAIGNS
            : routes.BRAND.DASHBOARD
      );
    }
  }, [user, router]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const errors = form.formState.errors;

  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => api.post(ENDPOINTS.LOGIN, payload),
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error("Error", { description: message || "Login failed" });
    },
    onSuccess: async (data) => {
      const { userData, dashboardRoute } = await fetchUserDataForSession(data.data);
      setUser(userData);
      toast.success("Success", { description: "Login successful!" });
      router.push(
        returnTo ||
          (dashboardRoute === "viewer"
            ? routes.WATCH
            : dashboardRoute === "admin"
              ? routes.ADMIN.CAMPAIGNS
              : routes.BRAND.DASHBOARD)
      );
    },
  });

  const onSubmit = (values: LoginValues) => loginMutation.mutate(values);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--ink-900)" }}>
      <div className="w-full max-w-sm">
        <Link href={routes.HOME} className="flex items-center justify-center gap-2 mb-6">
          <LogoMark />
          <Wordmark />
        </Link>

        <Card>
          <h1 className="text-center" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 21, color: "var(--txt)" }}>
            Welcome back
          </h1>
          <p className="text-center fb-hint mt-1">Sign in to continue</p>

          <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-3">
            <Field label="Email address" htmlFor="email">
              <Input id="email" type="email" placeholder="you@example.com" {...form.register("email")} />
              {errors.email && <span className="fb-hint" style={{ color: "var(--spent)" }}>{errors.email.message}</span>}
            </Field>

            <Field label="Password" htmlFor="password">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  style={{ paddingRight: 40 }}
                  {...form.register("password")}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--faint)" }}
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <span className="fb-hint" style={{ color: "var(--spent)" }}>{errors.password.message}</span>}
            </Field>

            <div className="flex justify-end">
              <Link href={routes.FORGOT_PASSWORD} style={{ color: "var(--accent)", fontSize: 12.5 }}>
                Forgot password?
              </Link>
            </div>

            <Button type="submit" variant="primary" className="w-full justify-center" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
            <span className="fb-hint">or</span>
            <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
          </div>

          <GoogleAuthBtn returnTo={returnTo} />

          <p className="text-center fb-hint mt-5">
            Don&apos;t have an account?{" "}
            <Link
              href={returnTo ? `${routes.REGISTER}?returnTo=${encodeURIComponent(returnTo)}` : routes.REGISTER}
              style={{ color: "var(--accent)", fontWeight: 600 }}>
              Sign up
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
