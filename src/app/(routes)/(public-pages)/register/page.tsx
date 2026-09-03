"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAtomValue } from "jotai/react";
import { userAtom } from "@/atom/user";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/freebiz-card";
import { Field } from "@/components/ui/freebiz-field";
import { Input } from "@/components/ui/freebiz-input";
import { Button } from "@/components/ui/freebiz-button";
import { LogoMark, Wordmark } from "@/components/shell/logo-mark";
import { z } from "zod";
import { isAxiosError } from "axios";
import { User, Building, Eye, EyeOff, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { toast } from "sonner";
import { routes } from "@/app/_utils/routes";
import GoogleAuthBtn from "@/components/auth/google-auth";

// §1 of API_CONTRACT_ADS_REWARD_PLATFORM.md — both viewer and brand register
// now take only { username, email, password }. Company/business details are
// deferred to post-signup profile completion (§2).
const registrationSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be less than 30 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Letters, numbers, and underscores only"),
  email: z.email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegistrationValues = z.infer<typeof registrationSchema>;

// RESTYLE (design/DECISIONS.md #26-30) — same minimal centered-card
// treatment as /login. Placeholders ("Username"/"Email address"/
// "Password") and the "Sign Up" button text are kept exactly — this
// page's own test suite asserts them directly.
function RegisterForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAtomValue(userAtom);
  const [accountType, setAccountType] = useState<"user" | "brand">(
    (searchParams.get("type") as "user" | "brand") || "user"
  );
  const returnTo = searchParams.get("returnTo") || undefined;
  const [showPassword, setShowPassword] = useState(false);

  // Viewers land on the billboard, not /user/dashboard — see the matching
  // comment in login/page.tsx (DECISIONS.md #6 parks that route).
  useEffect(() => {
    if (user) {
      router.push(user.userType === "viewer" ? routes.WATCH : routes.BRAND.DASHBOARD);
    }
  }, [user, router]);

  const form = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { username: "", email: "", password: "" },
  });
  const errors = form.formState.errors;

  const registerMutation = useMutation({
    mutationFn: (payload: RegistrationValues) =>
      api.post(
        accountType === "user" ? ENDPOINTS.REGISTER_VIEWER : ENDPOINTS.REGISTER_BRAND,
        payload
      ),
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error("Error", { description: message || "Registration failed" });
    },
    onSuccess: (data, variables) => {
      toast.success("Success", { description: "Registered successfully!" });
      const params = new URLSearchParams({
        email: variables.email,
        activation_token: (data.data as { activationToken: string }).activationToken,
      });
      if (returnTo) params.set("returnTo", returnTo);
      router.push(`${routes.VERIFY_OTP}?${params.toString()}`);
    },
  });

  const onSubmit = (data: RegistrationValues) => registerMutation.mutate(data);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--ink-900)" }}>
      <div className="w-full max-w-sm">
        <Link href={routes.HOME} className="flex items-center justify-center gap-2 mb-6">
          <LogoMark />
          <Wordmark />
        </Link>

        <Card>
          <h1 className="text-center" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 21, color: "var(--txt)" }}>
            Create account
          </h1>
          <p className="text-center fb-hint mt-1">Watch ads, catch freebie codes, earn real cash</p>

          <div className="flex rounded-xl p-1 mt-5" style={{ background: "var(--ink-900)" }}>
            <button
              type="button"
              onClick={() => {
                setAccountType("user");
                form.reset();
              }}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all"
              style={accountType === "user" ? { background: "var(--free)", color: "var(--ink-900)" } : { color: "var(--muted)" }}>
              <User className="h-4 w-4 inline mr-2" />
              Viewer
            </button>
            <button
              type="button"
              onClick={() => {
                setAccountType("brand");
                form.reset();
              }}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all"
              style={accountType === "brand" ? { background: "var(--brand)", color: "var(--txt)" } : { color: "var(--muted)" }}>
              <Building className="h-4 w-4 inline mr-2" />
              Brand
            </button>
          </div>

          <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(onSubmit)} key={accountType}>
            <Field label="Username" htmlFor="username">
              <Input id="username" placeholder="Username" {...form.register("username")} />
              {errors.username && <span className="fb-hint" style={{ color: "var(--spent)" }}>{errors.username.message}</span>}
            </Field>

            <Field label="Email address" htmlFor="email">
              <Input id="email" type="email" placeholder="Email address" {...form.register("email")} />
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

            <Button type="submit" variant="primary" className="w-full justify-center" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign up"}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
            <span className="fb-hint">or</span>
            <div className="flex-1 h-px" style={{ background: "var(--line)" }} />
          </div>

          <GoogleAuthBtn returnTo={returnTo} />

          <p className="text-center fb-hint mt-5">
            Already have an account?{" "}
            <Link
              href={returnTo ? `${routes.LOGIN}?returnTo=${encodeURIComponent(returnTo)}` : routes.LOGIN}
              style={{ color: "var(--accent)", fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
          <p className="text-center fb-hint mt-3">
            By creating an account, you agree to our{" "}
            <Link href="/terms" style={{ color: "var(--accent)" }}>Terms</Link> and{" "}
            <Link href="/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
