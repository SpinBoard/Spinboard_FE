"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAtomValue } from "jotai/react";
import { userAtom } from "@/atom/user";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GradientButton } from "@/components/ui/gradient-button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { z } from "zod";
import { isAxiosError } from "axios";
import { User, Building, Eye, EyeOff, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { toast } from "sonner";
import { routes } from "@/app/_utils/routes";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import GoogleAuthBtn from "@/components/auth/google-auth";

// §1 of API_CONTRACT_ADS_REWARD_PLATFORM.md — both gamer and brand register
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

function RegisterForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const user = useAtomValue(userAtom);
  const [accountType, setAccountType] = useState<"user" | "brand">(
    (searchParams.get("type") as "user" | "brand") || "user"
  );
  const referrerUsername =
    searchParams.get("ref") ||
    searchParams.get("referralCode") ||
    searchParams.get("referrerUsername") ||
    searchParams.get("referrerId") ||
    undefined;
  const returnTo = searchParams.get("returnTo") || undefined;
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (user) {
      router.push(user.userType === "gamer" ? routes.USER.DASHBOARD : routes.BRAND.DASHBOARD);
    }
  }, [user, router]);

  const form = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { username: "", email: "", password: "" },
  });

  const registerMutation = useMutation({
    mutationFn: (payload: RegistrationValues) =>
      api.post(
        accountType === "user" ? ENDPOINTS.REGISTER_GAMER : ENDPOINTS.REGISTER_BRAND,
        accountType === "user" && referrerUsername
          ? { ...payload, referrerUsername }
          : payload
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
              Create account
            </h1>
            <p className="text-muted-foreground text-center text-sm mb-6">
              Watch ads, answer quizzes, spin to earn
            </p>

            <div className="flex bg-white/5 rounded-xl p-1 mb-6">
              <button
                type="button"
                onClick={() => {
                  setAccountType("user");
                  form.reset();
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                  accountType === "user"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                <User className="h-4 w-4 inline mr-2" />
                Player
              </button>
              <button
                type="button"
                onClick={() => {
                  setAccountType("brand");
                  form.reset();
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                  accountType === "brand"
                    ? "bg-secondary text-secondary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}>
                <Building className="h-4 w-4 inline mr-2" />
                Brand
              </button>
            </div>

            <Form {...form} key={accountType}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder="Username" {...field} />
                      </FormControl>
                      <FormMessage className="text-destructive text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type="email" placeholder="Email address" {...field} />
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
                            type={showPassword ? "text" : "password"}
                            placeholder="Password"
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

                <GradientButton
                  type="submit"
                  disabled={registerMutation.isPending}
                  variant={accountType === "user" ? "primary" : "secondary"}
                  className="w-full p-5 text-base border-0 mt-6">
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    "Sign Up"
                  )}
                </GradientButton>
              </form>
            </Form>

            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-border" />
              <span className="text-muted-foreground text-sm">or</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <GoogleAuthBtn
              referrerUsername={accountType === "user" ? referrerUsername : undefined}
              returnTo={returnTo}
            />

            <p className="text-center text-muted-foreground text-sm mt-6">
              Already have an account?{" "}
              <Link href={routes.LOGIN} className="text-secondary font-semibold hover:underline">
                Sign In
              </Link>
            </p>
            <p className="text-sm text-center text-muted-foreground/70 mt-4">
              By creating an account, you agree to our{" "}
              <Link href="/terms" className="text-secondary hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="text-secondary hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
      <Footer />
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
