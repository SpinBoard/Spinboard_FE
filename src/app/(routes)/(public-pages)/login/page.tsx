"use client";

import Link from "next/link";
import { routes } from "@/app/_utils/routes";
import { Suspense, useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { GradientButton } from "@/components/ui/gradient-button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
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
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
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

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || undefined;
  const setUser = useSetAtom(userAtom);
  const user = useAtomValue(userAtom);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      router.push(user.userType === "gamer" ? routes.USER.DASHBOARD : routes.BRAND.DASHBOARD);
    }
  }, [user, router]);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

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
        returnTo || (dashboardRoute === "gamer" ? routes.USER.DASHBOARD : routes.BRAND.DASHBOARD)
      );
    },
  });

  const onSubmit = (values: LoginValues) => loginMutation.mutate(values);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden pt-32">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute w-96 h-96 bg-primary opacity-20 rounded-full filter blur-[80px] -top-24 -right-24" />
          <div className="absolute w-72 h-72 bg-secondary opacity-20 rounded-full filter blur-[80px] -bottom-12 -left-12" />
        </div>

        <div className="w-full max-w-sm relative z-10">
          <div className="bg-card/60 border border-border rounded-2xl p-8 backdrop-blur-sm">
            <h1 className="text-2xl font-bold text-foreground text-center mb-1 font-sora">
              Welcome back
            </h1>
            <p className="text-muted-foreground text-center text-sm mb-6">Sign in to continue</p>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Email address" type="email" {...field} />
                      </FormControl>
                      <FormMessage className="text-destructive text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="relative">
                          <Input
                            placeholder="Password"
                            type={showPassword ? "text" : "password"}
                            className="pr-12"
                            {...field}
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage className="text-destructive text-xs" />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end -mt-2 mb-4">
                  <Link href={routes.FORGOT_PASSWORD} className="text-secondary text-sm hover:underline">
                    Forgot password?
                  </Link>
                </div>

                <GradientButton
                  type="submit"
                  disabled={loginMutation.isPending}
                  variant="secondary"
                  className="w-full p-5 text-base border-0">
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </GradientButton>
              </form>
            </Form>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted-foreground text-sm">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <GoogleAuthBtn returnTo={returnTo} />

            <p className="text-center text-muted-foreground text-sm mt-6">
              Don&apos;t have an account?{" "}
              <Link href={routes.REGISTER} className="text-secondary font-semibold hover:underline">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
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
