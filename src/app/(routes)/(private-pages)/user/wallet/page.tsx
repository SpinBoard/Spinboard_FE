"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { endpointUrl, apiErrorMessage } from "@/app/_utils/helper";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import {
  WalletBalanceResponse,
  WalletTransactionsResponse,
  BankAccountsResponse,
  BankAccount,
} from "@/types";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Button } from "@/components/ui/freebiz-button";
import { Field } from "@/components/ui/freebiz-field";
import { Input } from "@/components/ui/freebiz-input";
import { Progress } from "@/components/ui/freebiz-progress";
import { Steps } from "@/components/ui/freebiz-steps";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeadCell,
  TableCell,
} from "@/components/ui/freebiz-table";
import { Trash2, Loader2, AlertCircle, CheckCircle2, Calendar } from "lucide-react";
import { formatCurrency, payoutProgressPercent } from "./wallet-utils";
import { useFreebieLimits } from "@/hooks/use-freebies";
import { LimitRow } from "@/components/ui/freebiz-limit-row";

// design/freebiz-mockup.html data-screen="v-wallet". Two pieces of the
// mockup are deliberately left out rather than faked:
// - The phead's "Request cash-out" button and the mockup's whole "How
//   cash-out works" request -> secret-code -> WhatsApp flow don't exist —
//   BUSINESS_RULES.md is explicit there is no withdrawal endpoint at all.
//   The "How it works" card below is kept but rewritten to describe the
//   real mechanism (automatic inclusion in the weekly run), not the
//   mockup's fictional request flow.
// - "Spend in marketplace" (phead) has no real data/route behind it: the
//   marketplace is a business directory with no checkout, and there's no
//   v-market redemption screen. "Today's limits" IS now real — GET
//   /freebies/limits/mine (§2 Revamp 6) reports today's claim-limit usage
//   proactively instead of only surfacing it reactively via a 403.
export default function WalletPage() {
  const user = useAtomValue(userAtom);
  const queryClient = useQueryClient();
  const authHeaders = { headers: { Authorization: `Bearer ${user?.accessToken}` } };

  const [bankForm, setBankForm] = useState({ accountNumber: "", bankCode: "", bankName: "" });
  const [addBankMessage, setAddBankMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const { data: balance, isLoading: loadingBalance } = useQuery({
    queryKey: ["wallet-balance"],
    queryFn: () =>
      axios
        .get<WalletBalanceResponse>(endpointUrl(ENDPOINTS.WALLET_BALANCE), authHeaders)
        .then((res) => res.data),
    enabled: !!user?.accessToken,
  });

  const { data: transactionsData, isLoading: loadingTransactions } = useQuery({
    queryKey: ["wallet-transactions"],
    queryFn: () =>
      axios
        .get<WalletTransactionsResponse>(
          endpointUrl(ENDPOINTS.WALLET_TRANSACTIONS(50)),
          authHeaders
        )
        .then((res) => res.data.transactions),
    enabled: !!user?.accessToken,
  });

  // Cash-only since 2026-08-29 — filter out any AIRTIME entry the backend
  // still returns (moot now that no new airtime drops exist) rather than
  // display it.
  const { data: allLimits } = useFreebieLimits(!!user?.accessToken);
  const limits = allLimits?.filter((limit) => limit.type === "CASH");

  const { data: bankAccounts, isLoading: loadingBankAccounts } = useQuery({
    queryKey: ["wallet-bank-accounts"],
    queryFn: () =>
      axios
        .get<BankAccountsResponse>(endpointUrl(ENDPOINTS.WALLET_BANK_ACCOUNTS), authHeaders)
        .then((res) => res.data.bankAccounts),
    enabled: !!user?.accessToken,
  });

  // POST /wallet/bank-accounts resolves the account name via Paystack and
  // saves in the same call — there's no separate "preview" endpoint, so the
  // resolved name is shown right after saving rather than before.
  const addBankAccountMutation = useMutation({
    mutationFn: () =>
      axios
        .post<{ bankAccount: BankAccount }>(
          endpointUrl(ENDPOINTS.WALLET_BANK_ACCOUNTS),
          bankForm,
          authHeaders
        )
        .then((res) => res.data.bankAccount),
    onSuccess: (bankAccount) => {
      setAddBankMessage({
        type: "success",
        text: `Added — resolved account name: ${bankAccount.accountName}. If this isn't you, remove it below and try again.`,
      });
      setBankForm({ accountNumber: "", bankCode: "", bankName: "" });
      queryClient.invalidateQueries({ queryKey: ["wallet-bank-accounts"] });
    },
    onError: (error) => {
      setAddBankMessage({
        type: "error",
        text: apiErrorMessage(error, "Couldn't add this bank account. Please check the details and try again."),
      });
    },
  });

  const deleteBankAccountMutation = useMutation({
    mutationFn: (id: string) =>
      axios.delete(endpointUrl(ENDPOINTS.WALLET_BANK_ACCOUNT_DELETE(id)), authHeaders),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wallet-bank-accounts"] });
    },
  });

  const handleAddBankAccount = (e: React.FormEvent) => {
    e.preventDefault();
    setAddBankMessage(null);
    addBankAccountMutation.mutate();
  };

  if (loadingBalance) {
    return <PageLoader withLayout={false} message="Loading your wallet..." />;
  }

  const progressPct = payoutProgressPercent(balance?.balance ?? 0, balance?.payoutThreshold ?? 0);
  const currency = balance?.currency ?? "NGN";

  return (
    <div className="space-y-4">
      <div>
        <p
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--faint)",
          }}>
          Viewers / Wallet
        </p>
        <h1
          className="mt-1"
          style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
          Your wallet
        </h1>
        <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
          Cash from redeemed freebie codes — paid out weekly, once your balance clears the
          threshold.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.55fr_1fr] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          <Card>
            <p
              style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)" }}>
              Available balance
            </p>
            <div
              className="mt-1.5"
              data-testid="wallet-balance"
              style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 34, letterSpacing: "-0.03em", color: "var(--txt)" }}>
              {formatCurrency(balance?.balance ?? 0, currency)}
            </div>

            {balance && (
              <div className="mt-3 space-y-2" data-testid="payout-progress">
                <Progress value={progressPct} color="var(--free)" />
                <div className="flex flex-wrap items-center justify-between gap-2" style={{ fontSize: 12, color: "var(--muted)" }}>
                  <span>
                    {balance.amountToThreshold > 0
                      ? `${formatCurrency(balance.amountToThreshold, currency)} to next payout`
                      : "Threshold met — included in the next payout run"}
                  </span>
                  {balance.nextPayoutDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(balance.nextPayoutDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="fb-hint">
                  Cash only leaves via a manual weekly payout run to your default bank account —
                  there&apos;s no self-serve withdrawal.
                </p>
              </div>
            )}
          </Card>

          <Card tight>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Entry</TableHeadCell>
                  <TableHeadCell>Reference</TableHeadCell>
                  <TableHeadCell>Date</TableHeadCell>
                  <TableHeadCell style={{ textAlign: "right" }}>Amount</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingTransactions ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--muted)" }} />
                    </TableCell>
                  </TableRow>
                ) : !transactionsData || transactionsData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="fb-hint">
                      No transactions yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  transactionsData.map((tx) => (
                    <TableRow key={tx._id}>
                      <TableCell style={{ textTransform: "capitalize", color: "var(--txt)" }}>
                        <b>{tx.reason.replace(/_/g, " ").toLowerCase()}</b>
                      </TableCell>
                      <TableCell className="fb-hint" style={{ fontFamily: tx.referenceId ? "var(--mono)" : undefined }}>
                        {tx.referenceId ?? "—"}
                      </TableCell>
                      <TableCell className="fb-hint">{new Date(tx.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell
                        style={{
                          textAlign: "right",
                          fontFamily: "var(--mono)",
                          fontWeight: 700,
                          color: tx.type === "credit" ? "var(--live)" : "var(--spent)",
                        }}>
                        {tx.type === "credit" ? "+" : "−"}
                        {formatCurrency(tx.amount, currency)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        <div className="space-y-4">
          {limits && limits.length > 0 && (
            <Card>
              <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Today&apos;s limits</h3>
              <div className="mt-2">
                {limits.map((limit) => (
                  <LimitRow
                    key={limit.type}
                    label="Cash claims"
                    value={
                      <>
                        {limit.claimedToday} of {limit.cap}
                        {limit.remaining === 0 && limit.resetsAt && (
                          <span className="fb-hint" style={{ marginLeft: 6 }}>
                            resets {new Date(limit.resetsAt).toLocaleTimeString()}
                          </span>
                        )}
                      </>
                    }
                  />
                ))}
              </div>
            </Card>
          )}

          <Card>
            <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Bank accounts</h3>
            <div className="mt-3 space-y-2">
              {loadingBankAccounts ? (
                <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--muted)" }} />
              ) : bankAccounts && bankAccounts.length > 0 ? (
                bankAccounts.map((acc) => (
                  <div
                    key={acc._id}
                    data-testid="bank-account-row"
                    className="flex items-center justify-between gap-3 p-2.5 rounded-lg"
                    style={{ background: "var(--ink-900)", border: "1px solid var(--line)" }}>
                    <div>
                      <p style={{ fontSize: 13, color: "var(--txt)" }}>{acc.accountName}</p>
                      <p className="fb-hint">
                        {acc.bankName} · ****{acc.accountNumber.slice(-4)}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Remove bank account"
                      disabled={deleteBankAccountMutation.isPending}
                      onClick={() => deleteBankAccountMutation.mutate(acc._id)}
                      style={{ color: "var(--spent)" }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              ) : (
                <CardNote>No bank accounts added yet.</CardNote>
              )}
            </div>

            <form onSubmit={handleAddBankAccount} className="mt-3.5 pt-3.5 space-y-2.5" style={{ borderTop: "1px solid var(--line)" }}>
              <Field label="Account number">
                <Input
                  placeholder="Account number"
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  required
                />
              </Field>
              <Field label="Bank name">
                <Input
                  placeholder="Bank name"
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  required
                />
              </Field>
              <Field label="Bank code">
                <Input
                  placeholder="Bank code"
                  value={bankForm.bankCode}
                  onChange={(e) => setBankForm({ ...bankForm, bankCode: e.target.value })}
                  required
                />
              </Field>
              <Button type="submit" variant="primary" disabled={addBankAccountMutation.isPending} className="w-full justify-center">
                {addBankAccountMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Bank Account"}
              </Button>
              {addBankMessage && (
                <p
                  className="flex items-start gap-2"
                  style={{ fontSize: 12.5, color: addBankMessage.type === "success" ? "var(--live)" : "var(--spent)" }}>
                  {addBankMessage.type === "success" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  )}
                  {addBankMessage.text}
                </p>
              )}
            </form>
          </Card>

          <Card>
            <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>How it works</h3>
            <Steps
              className="mt-2.5"
              items={[
                { title: "Redeem a cash code.", description: "It credits your wallet immediately — nothing here ever expires." },
                { title: "Your balance builds up.", description: "Keep watching, keep applying codes." },
                { title: "Get paid on the weekly run.", description: "Once you clear the threshold, admin includes you and transfers to your saved bank account." },
              ]}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
