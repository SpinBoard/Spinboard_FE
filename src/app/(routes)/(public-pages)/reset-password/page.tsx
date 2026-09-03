"use client";

import Link from "next/link";
import { routes } from "@/app/_utils/routes";
import { useState, useEffect, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card } from "@/components/ui/freebiz-card";
import { Field } from "@/components/ui/freebiz-field";
import { Input } from "@/components/ui/freebiz-input";
import { Button } from "@/components/ui/freebiz-button";
import { LogoMark, Wordmark } from "@/components/shell/logo-mark";
import { Eye, EyeOff, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import axios, { isAxiosError } from "axios";
import { endpointUrl } from "@/app/_utils/helper";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";

type ResetPasswordPayload = {
  new_password: string;
  token: string;
};

const resetPasswordSchema = z.object({
  password: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
  confirmPassword: z.string().min(8, {
    message: "Password must be at least 8 characters.",
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

// RESTYLE (design/DECISIONS.md #26-30) — same minimal centered-card
// treatment as the other auth screens.
function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });
  const errors = form.formState.errors;

  const resetPasswordMutation = useMutation({
    mutationFn: async (payload: ResetPasswordPayload) => {
      return axios.post(endpointUrl(ENDPOINTS.RESET_PASSWORD), payload);
    },
    onError: (error: unknown) => {
      const errorMessage = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message || error.message
        : 'Failed to reset password'
      toast.error('Error', {
        description: errorMessage,
      })
    },
    onSuccess: () => {
      toast.success("Success", {
        description: "Password reset successfully!",
      });
      setPasswordReset(true);

      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push(routes.LOGIN);
      }, 3000);
    },
  });

  function onSubmit(values: ResetPasswordValues) {
    resetPasswordMutation.mutate({
      new_password: values.password,
      token: token as string
    });
  }

  // Check if token exists and is valid
  useEffect(() => {
    if (!token) {
      toast.error("Error", {
        description: "Invalid or missing reset token",
      });
      router.push(routes.FORGOT_PASSWORD);
    }
  }, [token, router]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--ink-900)" }}>
      <div className="w-full max-w-sm">
        <Link href={routes.HOME} className="flex items-center justify-center gap-2 mb-6">
          <LogoMark />
          <Wordmark />
        </Link>

        <Card>
          {passwordReset ? (
            <>
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(61,220,151,.15)" }}>
                  <CheckCircle2 className="h-8 w-8" style={{ color: "var(--live)" }} />
                </div>
                <h1 className="text-center" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 21, color: "var(--txt)" }}>
                  Password reset!
                </h1>
                <p className="fb-hint text-center mt-2">Your password has been reset successfully</p>
              </div>

              <p className="fb-hint text-center mb-4">Redirecting to login page...</p>

              <Link href={routes.LOGIN} className="block">
                <Button variant="primary" className="w-full justify-center">Go to sign in</Button>
              </Link>
            </>
          ) : (
            <>
              <h1 className="text-center" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 21, color: "var(--txt)" }}>
                Reset password
              </h1>
              <p className="fb-hint text-center mt-1">Enter your new password below</p>

              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-3">
                <Field label="New password" htmlFor="password">
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="New password"
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

                <Field label="Confirm new password" htmlFor="confirmPassword">
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm new password"
                      style={{ paddingRight: 40 }}
                      {...form.register("confirmPassword")}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      style={{ color: "var(--faint)" }}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <span className="fb-hint" style={{ color: "var(--spent)" }}>{errors.confirmPassword.message}</span>}
                </Field>

                <p className="fb-hint">Password must be at least 8 characters</p>

                <Button type="submit" variant="primary" className="w-full justify-center" disabled={resetPasswordMutation.isPending}>
                  {resetPasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reset password"}
                </Button>

                <Link href={routes.LOGIN} className="block">
                  <Button type="button" variant="ghost" className="w-full justify-center">
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                  </Button>
                </Link>
              </form>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
