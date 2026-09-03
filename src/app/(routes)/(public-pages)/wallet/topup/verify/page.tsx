"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, AlertCircle, Loader2, ArrowLeft, LogIn } from "lucide-react";
import { Card } from "@/components/ui/freebiz-card";
import { Pill } from "@/components/ui/freebiz-pill";
import { Button } from "@/components/ui/freebiz-button";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { routes } from "@/app/_utils/routes";
import { useVerifyWalletTopup } from "@/hooks/use-wallet-topup";

// New 2026-09-02 — brand wallet top-up (see brand/wallet/page.tsx). Same
// four-state shape as /payment/verify (loading/success/failed/
// unauthenticated) for the same reason: Paystack's callback_url can land
// in a tab with no session at all.
function WalletTopupVerify() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAtomValue(userAtom);
  const [status, setStatus] = useState<"loading" | "success" | "failed" | "unauthenticated">("loading");
  const [amount, setAmount] = useState<number | null>(null);

  const reference = searchParams.get("reference");
  const trxref = searchParams.get("trxref");
  const verifyTopup = useVerifyWalletTopup(reference);

  useEffect(() => {
    if (!reference || !trxref) {
      setStatus("failed");
      return;
    }
    if (!user?.accessToken) {
      setStatus("unauthenticated");
      return;
    }
    verifyTopup.mutate(undefined, {
      onSuccess: (data) => {
        setAmount(data.transaction.amount);
        setStatus(data.success && data.transaction.status === "success" ? "success" : "failed");
      },
      onError: () => setStatus("failed"),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reference, trxref, user?.accessToken]);

  const loginReturnTo = `${routes.WALLET_TOPUP_VERIFY}?${searchParams.toString()}`;

  const stateIcon = {
    loading: <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--admin)" }} />,
    success: <CheckCircle className="w-8 h-8" style={{ color: "var(--live)" }} />,
    failed: <AlertCircle className="w-8 h-8" style={{ color: "var(--spent)" }} />,
    unauthenticated: <LogIn className="w-8 h-8" style={{ color: "var(--free)" }} />,
  }[status];

  const stateBg = {
    loading: "rgba(76,201,240,.15)",
    success: "rgba(61,220,151,.15)",
    failed: "rgba(255,77,94,.15)",
    unauthenticated: "rgba(255,210,63,.15)",
  }[status];

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--ink-900)" }}>
      <div className="w-full max-w-lg">
        <Card>
          <div className="text-center pb-4">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full flex items-center justify-center" style={{ background: stateBg }}>
              {stateIcon}
            </div>
            <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 21, color: "var(--txt)" }}>
              {status === "loading" && "Verifying top-up..."}
              {status === "success" && "Wallet topped up!"}
              {status === "failed" && "Top-up verification failed"}
              {status === "unauthenticated" && "Log in to verify your top-up"}
            </h1>
            <p className="fb-hint mt-2">
              {status === "loading" && "Please wait while we confirm your payment"}
              {status === "success" && `Your wallet was credited${amount ? ` ₦${amount.toLocaleString()}` : ""}.`}
              {status === "failed" && "There was an issue verifying your payment"}
              {status === "unauthenticated" && "We couldn't find your session in this browser tab"}
            </p>
          </div>

          {status === "failed" && (
            <Card style={{ borderColor: "rgba(255,77,94,.3)", background: "rgba(255,77,94,.06)" }}>
              <Pill tone="bad" dot>Verification failed</Pill>
              <p className="mt-2" style={{ fontSize: 13, color: "var(--txt)" }}>
                We were unable to verify your top-up — this could be a network issue or an invalid
                reference. Nothing was charged twice.
              </p>
            </Card>
          )}

          {status === "unauthenticated" && (
            <Card style={{ borderColor: "rgba(255,210,63,.35)", background: "rgba(255,210,63,.08)" }}>
              <Pill tone="warn" dot>Not logged in here</Pill>
              <p className="mt-2" style={{ fontSize: 13, color: "var(--txt)" }}>
                Your reference is saved below — log in and we&apos;ll verify it right away.
              </p>
            </Card>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            {status === "unauthenticated" ? (
              <Link href={`${routes.LOGIN}?returnTo=${encodeURIComponent(loginReturnTo)}`} className="flex-1">
                <Button variant="primary" className="w-full justify-center"><LogIn className="w-4 h-4" /> Log in to verify</Button>
              </Link>
            ) : (
              <Button variant="primary" className="flex-1 justify-center" onClick={() => router.push(routes.BRAND.WALLET)}>
                {status === "success" ? "View wallet" : "Return to wallet"}
              </Button>
            )}
            {status === "failed" && (
              <Button variant="ghost" className="flex-1 justify-center" onClick={() => window.location.reload()}>Try again</Button>
            )}
          </div>
        </Card>

        <div className="text-center mt-5">
          <Link href={routes.HOME} className="inline-flex items-center gap-2" style={{ color: "var(--muted)", fontSize: 13 }}>
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function WalletTopupVerifyPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <WalletTopupVerify />
    </Suspense>
  );
}
