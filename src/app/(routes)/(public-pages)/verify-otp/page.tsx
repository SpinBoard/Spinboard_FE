'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { GradientButton } from '@/components/ui/gradient-button'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { Loader2, ArrowLeft } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { api } from '@/lib/api'
import { ENDPOINTS } from '@/app/_utils/endpoints'
import { toast } from 'sonner'
import { fetchUserDataForSession } from '@/app/_utils/auth-session'
import { useSetAtom } from 'jotai/react'
import { userAtom } from '@/atom/user'
import { routes } from '@/app/_utils/routes'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

type VerifyOTPPayload = {
  activation_token: string
  activation_code: string
}

function VerifyOTPForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const setUser = useSetAtom(userAtom)
  const [otp, setOtp] = useState('')
  const [email, setEmail] = useState('')
  const [activationToken, setActivationToken] = useState('')
  const returnTo = searchParams.get('returnTo') || undefined

  useEffect(() => {
    const emailParam = searchParams.get('email')
    const tokenParam = searchParams.get('activation_token')

    if (emailParam) setEmail(emailParam)
    if (tokenParam) setActivationToken(tokenParam)

    if (!emailParam || !tokenParam) {
      toast.error('Invalid verification link')
      router.push(routes.REGISTER)
    }
  }, [searchParams, router])

  const verifyOTPMutation = useMutation({
    mutationFn: (payload: VerifyOTPPayload) => api.post(ENDPOINTS.ACTIVATE_USER, payload),
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined
      toast.error('Error', { description: message || 'Verification failed' })
    },
    onSuccess: async (data) => {
      const { userData, dashboardRoute } = await fetchUserDataForSession(data.data)
      setUser(userData)
      toast.success('Success', { description: 'Account verified successfully!' })
      // §1 — a completed anon ad-cycle/spin credit migrates to this account
      // automatically server-side; returnTo (e.g. back to /watch) preserves
      // the client-side spin-machine state too.
      router.push(
        returnTo ||
          (dashboardRoute === 'gamer'
            ? userData.profileComplete
              ? routes.USER.DASHBOARD
              : routes.USER.PROFILE_COMPLETE
            : routes.BRAND.DASHBOARD)
      )
    },
  })

  const handleOTPChange = (value: string) => {
    setOtp(value)
    if (value.length === 4) handleSubmit(value)
  }

  const handleSubmit = (otpValue?: string) => {
    const codeToSubmit = otpValue || otp
    if (codeToSubmit.length !== 4) {
      toast.error('Please enter a 4-digit code')
      return
    }
    verifyOTPMutation.mutate({
      activation_token: activationToken,
      activation_code: codeToSubmit,
    })
  }

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
              Verify Your Account
            </h1>
            <p className="text-muted-foreground text-center text-sm mb-2">
              We&apos;ve sent a 4-digit code to
            </p>
            <p className="text-secondary text-center text-sm font-medium mb-6">{email}</p>

            <div className="space-y-6">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={4}
                  value={otp}
                  onChange={handleOTPChange}
                  disabled={verifyOTPMutation.isPending}
                  className="gap-3">
                  <InputOTPGroup className="gap-3">
                    <InputOTPSlot index={0} className="w-12 h-12 text-lg font-bold bg-white/10 border-border text-foreground focus:border-secondary focus:bg-white/20" />
                    <InputOTPSlot index={1} className="w-12 h-12 text-lg font-bold bg-white/10 border-border text-foreground focus:border-secondary focus:bg-white/20" />
                    <InputOTPSlot index={2} className="w-12 h-12 text-lg font-bold bg-white/10 border-border text-foreground focus:border-secondary focus:bg-white/20" />
                    <InputOTPSlot index={3} className="w-12 h-12 text-lg font-bold bg-white/10 border-border text-foreground focus:border-secondary focus:bg-white/20" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <GradientButton
                onClick={() => handleSubmit()}
                disabled={verifyOTPMutation.isPending || otp.length !== 4}
                className="w-full py-6 text-base"
                variant="secondary">
                {verifyOTPMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify Account'
                )}
              </GradientButton>

              <div className="text-center">
                <p className="text-muted-foreground text-sm mb-2">Didn&apos;t receive the code?</p>
                <Button variant="link" className="p-0 h-auto text-secondary hover:text-secondary/80 font-medium">
                  Resend code
                </Button>
              </div>

              <div className="text-center pt-4 border-t border-border">
                <Link href={routes.REGISTER} className="inline-flex items-center gap-2 text-muted-foreground hover:text-secondary transition-colors text-sm">
                  <ArrowLeft className="h-4 w-4" />
                  Back to registration
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyOTPForm />
    </Suspense>
  )
}
