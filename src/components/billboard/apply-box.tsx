"use client";

import { useState } from "react";
import Link from "next/link";
import { useAtomValue } from "jotai";
import { isAxiosError } from "axios";
import { CheckCircle2, Loader2, Send, XCircle } from "lucide-react";
import { userAtom } from "@/atom/user";
import { useApplyCode } from "@/hooks/use-freebies";
import { apiErrorCode, apiErrorDetails, apiErrorMessage } from "@/app/_utils/helper";
import { routes } from "@/app/_utils/routes";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ApplyCodeResponse } from "@/types";

type ResultState =
  | { kind: "success"; data: ApplyCodeResponse }
  | { kind: "taken" }
  | { kind: "limit"; type: string; resetsAt: string }
  | { kind: "profile-incomplete" }
  | { kind: "login-required" }
  | { kind: "error"; message: string };

export function ApplyBox() {
  const user = useAtomValue(userAtom);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<ResultState | null>(null);
  const applyMutation = useApplyCode();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setResult(null);
    applyMutation.mutate(trimmed, {
      onSuccess: (data) => {
        setResult({ kind: "success", data });
        setCode("");
      },
      onError: (error) => {
        const status = isAxiosError(error) ? error.response?.status : undefined;
        const code = apiErrorCode(error);
        if (status === 409 || code === "CODE_ALREADY_TAKEN") {
          setResult({ kind: "taken" });
          return;
        }
        if (status === 403 && code === "DAILY_LIMIT_REACHED") {
          const details = apiErrorDetails<{ type: string; resetsAt: string }>(error);
          setResult({
            kind: "limit",
            type: details?.type ?? "freebie",
            resetsAt: details?.resetsAt ?? "",
          });
          return;
        }
        if (status === 403 && code === "PROFILE_INCOMPLETE") {
          setResult({ kind: "profile-incomplete" });
          return;
        }
        if (status === 401) {
          setResult({ kind: "login-required" });
          return;
        }
        setResult({ kind: "error", message: apiErrorMessage(error, "Couldn't apply that code.") });
      },
    });
  };

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Type a code — pinned freebie or your secret code"
          className="flex-1 font-mono"
          disabled={applyMutation.isPending}
        />
        <Button
          type="submit"
          aria-label="Apply code"
          disabled={applyMutation.isPending || !code.trim()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground">
          {applyMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>

      {result?.kind === "success" && (
        <div className="p-4 rounded-xl border border-success bg-success/10 space-y-1">
          <p className="flex items-center gap-2 font-sora font-bold text-foreground">
            <CheckCircle2 className="h-4 w-4 text-success" />
            {result.data.action === "CLAIMED" ? "You won it!" : "Redeemed!"}
          </p>
          {result.data.action === "CLAIMED" && (
            <>
              <p className="text-sm text-foreground">{result.data.valueLabel}</p>
              <p className="text-xs text-muted-foreground">
                Your secret code (also saved to{" "}
                <Link href={routes.USER.CLAIMS} className="text-secondary hover:underline">
                  your claims
                </Link>
                ):
              </p>
              <code className="block text-sm font-mono bg-white/5 rounded-lg px-3 py-2 break-all">
                {result.data.secretCode}
              </code>
            </>
          )}
          {result.data.action === "REDEEMED" && result.data.type === "CASH" && (
            <p className="text-sm text-foreground">
              Wallet credited — new balance: ₦{result.data.walletBalance.toLocaleString()}
            </p>
          )}
          {result.data.action === "REDEEMED" && result.data.type === "AIRTIME" && (
            <>
              <p className="text-sm text-foreground">{result.data.display}</p>
              <code className="block text-sm font-mono bg-white/5 rounded-lg px-3 py-2 break-all">
                {result.data.rechargeString}
              </code>
            </>
          )}
        </div>
      )}

      {result?.kind === "taken" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <XCircle className="h-4 w-4" />
          Just missed it — someone else claimed that code first. Watch the strip for the next one.
        </p>
      )}

      {result?.kind === "limit" && (
        <p className="text-sm text-muted-foreground">
          You&apos;ve already claimed your {result.type.toLowerCase()} freebie for today
          {result.resetsAt
            ? ` — resets ${new Date(result.resetsAt).toLocaleTimeString()}`
            : ""}
          .
        </p>
      )}

      {result?.kind === "profile-incomplete" && (
        <p className="text-sm text-muted-foreground">
          Complete your profile before claiming freebie codes —{" "}
          <Link href={routes.USER.PROFILE_COMPLETE} className="text-secondary hover:underline">
            finish it now
          </Link>
          .
        </p>
      )}

      {result?.kind === "login-required" && (
        <p className="text-sm text-muted-foreground">
          {user ? "Session expired" : "Log in"} to claim or redeem a code — the code stays live, so
          come right back.{" "}
          <Link href={routes.LOGIN} className="text-secondary hover:underline">
            Log in
          </Link>
        </p>
      )}

      {result?.kind === "error" && (
        <p className="text-sm text-destructive">{result.message}</p>
      )}
    </div>
  );
}
