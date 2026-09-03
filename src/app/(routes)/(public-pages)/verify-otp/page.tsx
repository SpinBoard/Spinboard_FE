'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card } from '@/components/ui/freebiz-card'
import { Button } from '@/components/ui/freebiz-button'
import { LogoMark, Wordmark } from '@/components/shell/logo-mark'
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

type VerifyOTPPayload = {
  activation_token: string
  activation_code: string
}

// RESTYLE (design/DECISIONS.md #26-30) — same minimal centered-card
// treatment as the other auth screens. InputOTP has no Freebiz-primitive
// equivalent (none of the 12 primitives cover a segmented code input), so
// it's kept as-is functionally — only its slot styling moved onto tokens.
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
      // returnTo (e.g. back to /watch) preserves the viewer's place on the
      // billboard after verifying. A verified viewer with a complete
      // profile lands on the billboard itself, not /user/dashboard — see
      // the matching comment in login/page.tsx (DECISIONS.md #6 parks
      // that route).
      router.push(
        returnTo ||
          (dashboardRoute === 'viewer'
            ? userData.profileComplete
              ? routes.WATCH
              : routes.USER.PROFILE_COMPLETE
            : dashboardRoute === 'admin'
              ? routes.ADMIN.CAMPAIGNS
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

  const slotStyle = { background: "var(--ink-900)", borderColor: "var(--line-2)", color: "var(--txt)" }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--ink-900)" }}>
      <div className="w-full max-w-sm">
        <Link href={routes.HOME} className="flex items-center justify-center gap-2 mb-6">
          <LogoMark />
          <Wordmark />
        </Link>

        <Card>
          <h1 className="text-center" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 21, color: "var(--txt)" }}>
            Verify your account
          </h1>
          <p className="fb-hint text-center mt-2">We&apos;ve sent a 4-digit code to</p>
          <p className="text-center mt-0.5" style={{ color: "var(--accent)", fontSize: 13.5, fontWeight: 600 }}>{email}</p>

          <div className="mt-5 space-y-4">
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={otp}
                onChange={handleOTPChange}
                disabled={verifyOTPMutation.isPending}
                className="gap-3">
                <InputOTPGroup className="gap-3">
                  <InputOTPSlot index={0} className="w-12 h-12 text-lg font-bold" style={slotStyle} />
                  <InputOTPSlot index={1} className="w-12 h-12 text-lg font-bold" style={slotStyle} />
                  <InputOTPSlot index={2} className="w-12 h-12 text-lg font-bold" style={slotStyle} />
                  <InputOTPSlot index={3} className="w-12 h-12 text-lg font-bold" style={slotStyle} />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              variant="primary"
              className="w-full justify-center"
              onClick={() => handleSubmit()}
              disabled={verifyOTPMutation.isPending || otp.length !== 4}>
              {verifyOTPMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify account'}
            </Button>

            <div className="text-center">
              <p className="fb-hint mb-1.5">Didn&apos;t receive the code?</p>
              <button style={{ color: "var(--accent)", fontSize: 13, fontWeight: 600 }}>
                Resend code
              </button>
            </div>

            <div className="text-center pt-3" style={{ borderTop: "1px solid var(--line)" }}>
              <Link href={routes.REGISTER} className="inline-flex items-center gap-2" style={{ color: "var(--muted)", fontSize: 13 }}>
                <ArrowLeft className="h-4 w-4" />
                Back to registration
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default function VerifyOTPPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ink-900)" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--accent)" }} />
      </div>
    }>
      <VerifyOTPForm />
    </Suspense>
  )
}
