'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card } from '@/components/ui/freebiz-card'
import { Pill } from '@/components/ui/freebiz-pill'
import { Button } from '@/components/ui/freebiz-button'
import { LimitRow } from '@/components/ui/freebiz-limit-row'
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ExternalLink,
  LogIn
} from 'lucide-react'
import Link from 'next/link'
import { routes } from '@/app/_utils/routes'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { ENDPOINTS } from '@/app/_utils/endpoints'
import { useAtomValue } from 'jotai'
import { userAtom } from '@/atom/user'

interface PaymentVerificationResponse {
  success: boolean
  message: string
  transaction: {
    reference: string
    amount: number
    status: 'success' | 'failed' | 'pending'
    packageType: string
  }
}

// RESTYLE (design/DECISIONS.md #31) — "Style the three states — pending,
// success, failed — with the pill and card primitives... the failure state
// says what went wrong and what to do, and does not apologise." The real
// code has a necessary fourth state (unauthenticated — Paystack's
// callback_url can land in a tab with no session, see the comment on the
// effect below) that isn't in the mockup's three; it's kept since dropping
// it reintroduces the "stuck on Verifying Payment forever" bug it fixed.
function PaymentVerify() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const user = useAtomValue(userAtom)
  const [verificationStatus, setVerificationStatus] = useState<
    'loading' | 'success' | 'failed' | 'unauthenticated'
  >('loading')
  const [paymentData, setPaymentData] = useState<PaymentVerificationResponse | null>(null)

  const reference = searchParams.get('reference')
  const trxref = searchParams.get('trxref')

  // Payment verification mutation — ad-campaign payments only (brand-side).
  // Marketplace checkout has no dedicated verify page; GET /marketplace/orders/mine
  // is the source of truth once the webhook processes the payment.
  const verifyPaymentMutation = useMutation({
    mutationFn: async () => {
      return api.get<PaymentVerificationResponse>(ENDPOINTS.AD_PAYMENTS_VERIFY(reference!))
    },
    onSuccess: (response) => {
      const data = response.data
      setPaymentData(data)

      if (data.success && data.transaction.status === 'success') {
        setVerificationStatus('success')
      } else {
        setVerificationStatus('failed')
      }
    },
    onError: (error) => {
      console.error('Payment verification failed:', error)
      setVerificationStatus('failed')
    },
  })

  // Bug fix: previously, when `reference`/`trxref` were present but
  // `user?.accessToken` wasn't (e.g. this tab has no session at all — most
  // commonly because Paystack's callback_url points at a different origin
  // than the one the brand was actually logged into, so localStorage here
  // is empty), neither branch below fired and the page stayed stuck on
  // "Verifying Payment..." forever with no error and no network call ever
  // made. Now every code path resolves to a terminal status.
  useEffect(() => {
    if (!reference || !trxref) {
      setVerificationStatus('failed')
      return
    }
    if (!user?.accessToken) {
      setVerificationStatus('unauthenticated')
      return
    }
    verifyPaymentMutation.mutate()
  }, [reference, trxref, user?.accessToken])

  const loginReturnTo = `${routes.PAYMENT_VERIFY}?${searchParams.toString()}`

  const handleReturnToCampaigns = () => {
    router.push(user?.userType === 'brand' ? routes.BRAND.CAMPAIGNS : routes.WATCH)
  }

  const formatCurrency = (amount: number) => `₦${amount.toLocaleString()}`

  const stateIcon = {
    loading: <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--admin)' }} />,
    success: <CheckCircle className="w-8 h-8" style={{ color: 'var(--live)' }} />,
    failed: <AlertCircle className="w-8 h-8" style={{ color: 'var(--spent)' }} />,
    unauthenticated: <LogIn className="w-8 h-8" style={{ color: 'var(--free)' }} />,
  }[verificationStatus]

  const stateBg = {
    loading: 'rgba(76,201,240,.15)',
    success: 'rgba(61,220,151,.15)',
    failed: 'rgba(255,77,94,.15)',
    unauthenticated: 'rgba(255,210,63,.15)',
  }[verificationStatus]

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--ink-900)' }}>
      <div className="w-full max-w-2xl">
        <Card>
          <div className="text-center pb-4">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center" style={{ background: stateBg }}>
              {stateIcon}
            </div>

            <h1 style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 21, color: 'var(--txt)' }}>
              {verificationStatus === 'loading' && 'Verifying payment...'}
              {verificationStatus === 'success' && 'Payment successful!'}
              {verificationStatus === 'failed' && 'Payment verification failed'}
              {verificationStatus === 'unauthenticated' && 'Log in to verify your payment'}
            </h1>

            <p className="fb-hint mt-2">
              {verificationStatus === 'loading' && 'Please wait while we confirm your payment'}
              {verificationStatus === 'success' && 'Your payment has been processed successfully'}
              {verificationStatus === 'failed' && 'There was an issue verifying your payment'}
              {verificationStatus === 'unauthenticated' && "We couldn't find your session in this browser tab"}
            </p>
          </div>

          <div className="space-y-4">
            {/* Payment Details */}
            {paymentData && verificationStatus === 'success' && (
              <Card tight style={{ padding: 16 }}>
                <h3 className="mb-1" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--txt)' }}>Payment details</h3>
                <LimitRow label="Brand" value={user?.companyName || 'N/A'} />
                <LimitRow label="Package type" value={<span style={{ textTransform: 'capitalize' }}>{paymentData.transaction.packageType}</span>} />
                <LimitRow label="Amount" value={formatCurrency(paymentData.transaction.amount)} />
                <LimitRow label="Status" value={<Pill tone="live" dot>{paymentData.transaction.status}</Pill>} />
              </Card>
            )}

            {/* Transaction References */}
            {trxref && (
              <Card tight style={{ padding: 16 }}>
                <h3 className="mb-1" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--txt)' }}>Transaction reference</h3>
                <p className="fb-hint" style={{ fontFamily: 'var(--mono)', wordBreak: 'break-all' }}>{trxref}</p>
              </Card>
            )}

            {/* Error Message */}
            {verificationStatus === 'failed' && (
              <Card style={{ borderColor: 'rgba(255,77,94,.3)', background: 'rgba(255,77,94,.06)' }}>
                <Pill tone="bad" dot>Verification failed</Pill>
                <p className="mt-2" style={{ fontSize: 13, color: 'var(--txt)' }}>
                  {paymentData?.message ||
                    'We were unable to verify your payment — this could be a network issue or an invalid payment reference.'}
                </p>
                <p className="fb-hint mt-1">
                  If this keeps happening, contact support with your transaction reference.
                </p>
              </Card>
            )}

            {/* Unauthenticated State */}
            {verificationStatus === 'unauthenticated' && (
              <Card style={{ borderColor: 'rgba(255,210,63,.35)', background: 'rgba(255,210,63,.08)' }}>
                <Pill tone="warn" dot>Not logged in here</Pill>
                <p className="mt-2" style={{ fontSize: 13, color: 'var(--txt)' }}>
                  Your payment reference is saved below — log in and we&apos;ll verify it right
                  away. Nothing was charged twice; this is just a browser session issue.
                </p>
              </Card>
            )}

            {/* Loading State */}
            {verificationStatus === 'loading' && (
              <div className="text-center py-6">
                <div className="flex items-center justify-center gap-3" style={{ color: 'var(--muted)' }}>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span style={{ fontSize: 13.5 }}>Contacting payment processor...</span>
                </div>
                <p className="fb-hint mt-2">This may take a few moments</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              {verificationStatus === 'unauthenticated' ? (
                <Link href={`${routes.LOGIN}?returnTo=${encodeURIComponent(loginReturnTo)}`} className="flex-1">
                  <Button variant="primary" className="w-full justify-center">
                    <LogIn className="w-4 h-4" />
                    Log in to verify
                  </Button>
                </Link>
              ) : (
                <Button variant="primary" className="flex-1 justify-center" onClick={handleReturnToCampaigns}>
                  {verificationStatus === 'success' ? 'View campaigns' : 'Return to campaigns'}
                </Button>
              )}

              {verificationStatus === 'failed' && (
                <Button variant="ghost" className="flex-1 justify-center" onClick={() => window.location.reload()}>
                  Try again
                </Button>
              )}
            </div>

            {/* Support link — routes.CONTACT has no page behind it yet (see
                footer.tsx's note), so this points at the same support
                mailbox /about links to instead of a 404. */}
            <div className="text-center pt-3" style={{ borderTop: '1px solid var(--line)' }}>
              <p className="fb-hint mb-1.5">Need help with your payment?</p>
              <a href="mailto:hello@freebiz.com" className="inline-flex items-center gap-1" style={{ color: 'var(--accent)', fontSize: 13, fontWeight: 600 }}>
                <ExternalLink className="w-3 h-3" />
                Contact support
              </a>
            </div>
          </div>
        </Card>

        <div className="text-center mt-5">
          <Link href={routes.HOME} className="inline-flex items-center gap-2" style={{ color: 'var(--muted)', fontSize: 13 }}>
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function PaymentVerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <PaymentVerify />
    </Suspense>
  )
}
