'use client'

import Link from 'next/link'
import { routes } from '@/app/_utils/routes'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from "zod";
import { Card } from '@/components/ui/freebiz-card'
import { Field } from '@/components/ui/freebiz-field'
import { Input } from '@/components/ui/freebiz-input'
import { Button } from '@/components/ui/freebiz-button'
import { LogoMark, Wordmark } from '@/components/shell/logo-mark'
import { ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import axios, { AxiosError } from 'axios'
import { endpointUrl } from '@/app/_utils/helper'
import { ENDPOINTS } from '@/app/_utils/endpoints'
import { toast } from 'sonner'

type ForgotPasswordPayload = {
  email: string;
};

const forgotPasswordSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
})

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

// RESTYLE (design/DECISIONS.md #26-30) — same minimal centered-card
// treatment as /login and /register.
export default function ForgotPasswordPage() {
  const [emailSent, setEmailSent] = useState(false)

  const form = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  })
  const errors = form.formState.errors

  const forgotPasswordMutation = useMutation({
    mutationFn: (payload: ForgotPasswordPayload) => {
      return axios.post(endpointUrl(`${ENDPOINTS.FORGOT_PASSWORD}`), payload);
    },
    onError: (error: AxiosError<{ message?: string }>) => {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to send reset link'
      toast.error('Error', {
        description: errorMessage,
      })
    },
    onSuccess: async (data) => {
      toast.success('Success', {
        description: data.data.message || 'Password reset link sent to your email!',
      })
      setEmailSent(true)
    },
  });

  function onSubmit(values: ForgotPasswordValues) {
    forgotPasswordMutation.mutate(values)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--ink-900)" }}>
      <div className="w-full max-w-sm">
        <Link href={routes.HOME} className="flex items-center justify-center gap-2 mb-6">
          <LogoMark />
          <Wordmark />
        </Link>

        <Card>
          {emailSent ? (
            <>
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(61,220,151,.15)" }}>
                  <CheckCircle2 className="h-8 w-8" style={{ color: "var(--live)" }} />
                </div>
                <h1 className="text-center" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 21, color: "var(--txt)" }}>
                  Check your email
                </h1>
                <p className="fb-hint text-center mt-2">
                  We&apos;ve sent a password reset link to your email address
                </p>
              </div>
              <div className="space-y-3">
                <p className="fb-hint text-center">
                  Didn&apos;t receive the email? Check your spam folder or{' '}
                  <button onClick={() => setEmailSent(false)} style={{ color: "var(--accent)", fontWeight: 600 }}>
                    try again
                  </button>
                </p>

                <Link href={routes.LOGIN} className="block">
                  <Button variant="ghost" className="w-full justify-center">
                    <ArrowLeft className="h-4 w-4" />
                    Back to sign in
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-center" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 21, color: "var(--txt)" }}>
                Forgot password?
              </h1>
              <p className="fb-hint text-center mt-1">No worries, we&apos;ll send you reset instructions</p>

              <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-3">
                <Field label="Email address" htmlFor="email">
                  <Input id="email" type="email" placeholder="Email address" {...form.register("email")} />
                  {errors.email && <span className="fb-hint" style={{ color: "var(--spent)" }}>{errors.email.message}</span>}
                </Field>

                <Button type="submit" variant="primary" className="w-full justify-center" disabled={forgotPasswordMutation.isPending}>
                  {forgotPasswordMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send reset link'}
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
  )
}
