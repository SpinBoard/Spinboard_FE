"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { Loader2, Wallet, Lock } from "lucide-react";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Button } from "@/components/ui/freebiz-button";
import { Pill } from "@/components/ui/freebiz-pill";
import { Field } from "@/components/ui/freebiz-field";
import { Input } from "@/components/ui/freebiz-input";
import { PageLoader } from "@/components/ui/page-loader";
import { userAtom } from "@/atom/user";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { apiErrorMessage } from "@/app/_utils/helper";
import { useInitializeWalletTopup } from "@/hooks/use-wallet-topup";
import { useQuotationUnlockStatus, usePurchaseQuotationUnlock } from "@/hooks/use-projects";
import { WalletBalanceResponse } from "@/types";

// New for brands (2026-09-02) — brands couldn't fund a wallet balance at
// all before the B2B quotation-unlock pass introduced the first thing
// worth spending it on. Same Paystack initialize/redirect pattern as
// ad-campaign payment (GoLiveDialog) and the viewer wallet page's
// transaction history — just a top-up in, an unlock-pass debit out; there's
// no payout/withdrawal concept on the brand side.
export default function BrandWalletPage() {
  const user = useAtomValue(userAtom);
  const [amount, setAmount] = useState("");

  const { data: balance, isLoading: loadingBalance } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: () => api.get<WalletBalanceResponse>(ENDPOINTS.WALLET_BALANCE).then((res) => res.data),
    enabled: !!user?.accessToken,
  });

  const { data: unlockStatus, isLoading: loadingUnlock } = useQuotationUnlockStatus();
  const purchaseUnlock = usePurchaseQuotationUnlock();
  const initializeTopup = useInitializeWalletTopup();

  const handleTopup = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0 || !user?.email) {
      toast.error("Enter a valid amount.");
      return;
    }
    initializeTopup.mutate(
      { amount: numericAmount, email: user.email },
      {
        onSuccess: (data) => {
          const authorizationUrl = data.data?.authorization_url;
          if (authorizationUrl) window.open(authorizationUrl, "_blank");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't start the top-up. Please try again.")),
      }
    );
  };

  if (loadingBalance) return <PageLoader withLayout={false} message="Loading your wallet..." />;

  const currency = balance?.currency ?? "NGN";

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <p style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)" }}>
          Brands / Wallet
        </p>
        <h1 className="mt-1" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
          Wallet
        </h1>
        <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
          Top up to purchase a quotation-unlock pass on the B2B marketplace.
        </p>
      </div>

      <Card>
        <p style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)" }}>
          Available balance
        </p>
        <div className="mt-1.5" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 34, letterSpacing: "-0.03em", color: "var(--txt)" }}>
          {currency === "NGN" ? "₦" : `${currency} `}{(balance?.balance ?? 0).toLocaleString()}
        </div>

        <form onSubmit={handleTopup} className="mt-4 pt-4 flex items-end gap-2 flex-wrap" style={{ borderTop: "1px solid var(--line)" }}>
          <Field label="Top up amount (₦)" htmlFor="amount" className="flex-1 min-w-[160px]">
            <Input id="amount" type="number" min="0" placeholder="e.g. 5000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Field>
          <Button type="submit" variant="primary" disabled={initializeTopup.isPending}>
            {initializeTopup.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wallet className="h-4 w-4" /> Top up</>}
          </Button>
        </form>
      </Card>

      <Card>
        <h3 className="flex items-center gap-2" style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>
          <Lock className="h-4 w-4" style={{ color: "var(--accent)" }} />
          Quotation unlock pass
        </h3>
        {loadingUnlock ? (
          <Loader2 className="h-4 w-4 animate-spin mt-2" style={{ color: "var(--muted)" }} />
        ) : (
          <>
            <div className="mt-2">
              <Pill tone={unlockStatus?.active ? "live" : "default"} dot>
                {unlockStatus?.active
                  ? `Active until ${new Date(unlockStatus.expiresAt!).toLocaleDateString()}`
                  : "Not active"}
              </Pill>
            </div>
            <CardNote className="mt-2">
              A flat, account-wide, 30-day pass that unlocks every quotation on every project you&apos;ve
              posted — paid by wallet debit. Purchasing again while active just extends the expiry.
            </CardNote>
            <Button
              variant="primary"
              className="mt-3"
              disabled={purchaseUnlock.isPending}
              onClick={() =>
                purchaseUnlock.mutate(undefined, {
                  onSuccess: (data) => toast.success(`Unlocked until ${new Date(data.expiresAt).toLocaleDateString()}.`),
                  onError: (err) => toast.error(apiErrorMessage(err, "Couldn't purchase the unlock pass. Check your balance.")),
                })
              }>
              {purchaseUnlock.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : unlockStatus?.active ? "Extend pass" : "Purchase pass"}
            </Button>
          </>
        )}
      </Card>
    </div>
  );
}
