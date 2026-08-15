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
import { MainLayout } from "@/components/layout/main-layout";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Wallet as WalletIcon,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Landmark,
  Receipt,
  Calendar,
} from "lucide-react";
import { formatCurrency, payoutProgressPercent } from "./wallet-utils";

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
    return <PageLoader message="Loading your wallet..." />;
  }

  const progressPct = payoutProgressPercent(balance?.balance ?? 0, balance?.payoutThreshold ?? 0);

  return (
    <MainLayout maxWidth="4xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 font-sora flex items-center gap-3">
            <WalletIcon className="h-8 w-8 text-secondary" />
            Wallet
          </h1>
          <p className="text-white/70">
            Cash from redeemed freebie codes — paid out weekly, once your balance clears the threshold.
          </p>
        </div>

        {/* Balance + payout progress */}
        <Card className="bg-card/50 backdrop-blur-sm border-white/10">
          <CardContent className="pt-6 space-y-4">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">
                Available Balance
              </p>
              <p className="text-4xl font-bold text-white font-sora" data-testid="wallet-balance">
                {formatCurrency(balance?.balance ?? 0, balance?.currency ?? "NGN")}
              </p>
            </div>

            {balance && (
              <div className="space-y-2" data-testid="payout-progress">
                <Progress value={progressPct} />
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>
                    {balance.amountToThreshold > 0
                      ? `${formatCurrency(balance.amountToThreshold, balance.currency)} to next payout`
                      : "Threshold met — included in the next payout run"}
                  </span>
                  {balance.nextPayoutDate && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(balance.nextPayoutDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <p className="text-white/40 text-xs">
                  Cash only leaves via a manual weekly payout run to your default bank account — there&apos;s
                  no self-serve withdrawal.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bank Accounts */}
        <Card className="bg-card/50 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white font-sora flex items-center gap-2">
              <Landmark className="h-5 w-5 text-secondary" />
              Bank Accounts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {loadingBankAccounts ? (
              <Loader2 className="h-5 w-5 animate-spin text-secondary" />
            ) : bankAccounts && bankAccounts.length > 0 ? (
              <div className="space-y-2">
                {bankAccounts.map((acc) => (
                  <div
                    key={acc._id}
                    data-testid="bank-account-row"
                    className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                    <div>
                      <p className="text-white font-medium text-sm">{acc.accountName}</p>
                      <p className="text-white/50 text-xs">
                        {acc.bankName} &bull; ****{acc.accountNumber.slice(-4)}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      disabled={deleteBankAccountMutation.isPending}
                      onClick={() => deleteBankAccountMutation.mutate(acc._id)}
                      className="text-red-400 hover:bg-red-500/10 hover:text-red-300">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/50 text-sm">No bank accounts added yet.</p>
            )}

            <form onSubmit={handleAddBankAccount} className="space-y-3 pt-2 border-t border-white/10">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input
                  placeholder="Account number"
                  value={bankForm.accountNumber}
                  onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  required
                />
                <Input
                  placeholder="Bank name"
                  value={bankForm.bankName}
                  onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  required
                />
                <Input
                  placeholder="Bank code"
                  value={bankForm.bankCode}
                  onChange={(e) => setBankForm({ ...bankForm, bankCode: e.target.value })}
                  className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={addBankAccountMutation.isPending}
                variant="outline"
                className="border-white/20 text-white hover:bg-white/10">
                {addBankAccountMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Add Bank Account
              </Button>
              {addBankMessage && (
                <p
                  className={`text-sm flex items-start gap-2 ${
                    addBankMessage.type === "success" ? "text-green-400" : "text-red-400"
                  }`}>
                  {addBankMessage.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  )}
                  {addBankMessage.text}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Transaction history */}
        <Card className="bg-card/50 backdrop-blur-sm border-white/10">
          <CardHeader>
            <CardTitle className="text-white font-sora flex items-center gap-2">
              <Receipt className="h-5 w-5 text-secondary" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loadingTransactions ? (
              <div className="p-6">
                <Loader2 className="h-5 w-5 animate-spin text-secondary" />
              </div>
            ) : transactionsData && transactionsData.length > 0 ? (
              <div className="space-y-1">
                {transactionsData.map((tx) => (
                  <div
                    key={tx._id}
                    className="flex items-center justify-between p-4 border-b border-white/5 last:border-b-0">
                    <div>
                      <p className="text-white text-sm capitalize">{tx.reason.replace(/_/g, " ").toLowerCase()}</p>
                      <p className="text-white/50 text-xs">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span
                      className={`font-mono font-semibold ${
                        tx.type === "credit" ? "text-green-400" : "text-red-400"
                      }`}>
                      {tx.type === "credit" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="p-6 text-white/50 text-sm">No transactions yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
