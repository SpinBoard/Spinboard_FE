"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAtomValue } from "jotai";
import { isAxiosError } from "axios";
import { Loader2, Send, XCircle } from "lucide-react";
import { userAtom } from "@/atom/user";
import { useApplyCode } from "@/hooks/use-freebies";
import { apiErrorCode, apiErrorDetails, apiErrorMessage } from "@/app/_utils/helper";
import { routes } from "@/app/_utils/routes";
import { Field } from "@/components/ui/freebiz-field";
import { Input } from "@/components/ui/freebiz-input";
import { Button } from "@/components/ui/freebiz-button";
import { Pill } from "@/components/ui/freebiz-pill";
import { VoucherChip } from "@/components/ui/freebiz-voucher-chip";
import { ApplyCodeResponse } from "@/types";

type ResultState =
  | { kind: "success"; data: ApplyCodeResponse }
  | { kind: "taken" }
  | { kind: "limit"; type: string; resetsAt: string }
  | { kind: "profile-incomplete" }
  | { kind: "login-required" }
  | { kind: "error"; message: string };

interface ApplyBoxProps {
  // Lets a caller (e.g. tapping "claim" on a freebie billboard takeover)
  // prefill the input instead of making the viewer retype the code.
  initialCode?: string;
}

// design/freebiz-mockup.html's .applybar — Field + Input + primary Button,
// one row.
export function ApplyBox({ initialCode }: ApplyBoxProps = {}) {
  const user = useAtomValue(userAtom);
  const [code, setCode] = useState("");
  const [result, setResult] = useState<ResultState | null>(null);
  const applyMutation = useApplyCode();

  useEffect(() => {
    if (initialCode) setCode(initialCode);
  }, [initialCode]);

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
      <form onSubmit={handleSubmit} className="flex gap-2 items-start">
        <Field label="Apply a code" className="flex-1">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Type the code on the board — e.g. FB-9K4T-77"
            style={{ fontFamily: "var(--mono)" }}
            disabled={applyMutation.isPending}
          />
        </Field>
        <Button
          type="submit"
          variant="primary"
          aria-label="Apply code"
          disabled={applyMutation.isPending || !code.trim()}
          style={{ marginTop: 24 }}>
          {applyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>

      {result?.kind === "success" && (
        <div className="p-4 rounded-xl border space-y-2" style={{ borderColor: "var(--live)", background: "rgba(61,220,151,.08)" }}>
          <Pill tone="live" dot>
            {result.data.action === "CLAIMED" ? "You won it!" : "Redeemed!"}
          </Pill>
          {result.data.action === "CLAIMED" && (
            <>
              <p className="text-sm" style={{ color: "var(--txt)" }}>{result.data.valueLabel}</p>
              <p className="text-xs" style={{ color: "var(--faint)" }}>
                Your secret code (also saved to{" "}
                <Link href={routes.USER.CLAIMS} style={{ color: "var(--accent)" }}>
                  your claims
                </Link>
                ):
              </p>
              <VoucherChip code={result.data.secretCode} />
            </>
          )}
          {result.data.action === "REDEEMED" && result.data.type === "CASH" && (
            <p className="text-sm" style={{ color: "var(--txt)" }}>
              Wallet credited — new balance: ₦{result.data.walletBalance.toLocaleString()}
            </p>
          )}
          {/* Legacy-only branch: freebies went cash-only 2026-08-29, but a
              secret code someone won before then can still redeem to an
              airtime PIN here — nothing a user has won ever expires. */}
          {result.data.action === "REDEEMED" && result.data.type === "AIRTIME" && (
            <>
              <p className="text-sm" style={{ color: "var(--txt)" }}>{result.data.display}</p>
              <VoucherChip code={result.data.rechargeString} />
            </>
          )}
        </div>
      )}

      {result?.kind === "taken" && (
        <p className="flex items-center gap-2 text-sm" style={{ color: "var(--muted)" }}>
          <XCircle className="h-4 w-4" />
          Just missed it — someone else claimed that code first. Watch the strip for the next one.
        </p>
      )}

      {result?.kind === "limit" && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          You&apos;ve already claimed your {result.type.toLowerCase()} freebie for today
          {result.resetsAt
            ? ` — resets ${new Date(result.resetsAt).toLocaleTimeString()}`
            : ""}
          .
        </p>
      )}

      {result?.kind === "profile-incomplete" && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          Complete your profile before claiming freebie codes —{" "}
          <Link href={routes.USER.PROFILE_COMPLETE} style={{ color: "var(--accent)" }}>
            finish it now
          </Link>
          .
        </p>
      )}

      {result?.kind === "login-required" && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {user ? "Session expired" : "Log in"} to claim or redeem a code — the code stays live, so
          come right back.{" "}
          <Link href={routes.LOGIN} style={{ color: "var(--accent)" }}>
            Log in
          </Link>
        </p>
      )}

      {result?.kind === "error" && (
        <p className="text-sm" style={{ color: "var(--spent)" }}>{result.message}</p>
      )}
    </div>
  );
}
