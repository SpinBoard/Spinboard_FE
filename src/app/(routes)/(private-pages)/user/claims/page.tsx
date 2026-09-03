"use client";

import { useMemo, useState } from "react";
import { useAtomValue } from "jotai";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { userAtom } from "@/atom/user";
import { useMyClaims, useRedeemClaim } from "@/hooks/use-freebies";
import { PageLoader } from "@/components/ui/page-loader";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Stat } from "@/components/ui/freebiz-stat";
import { Pill } from "@/components/ui/freebiz-pill";
import { Button } from "@/components/ui/freebiz-button";
import { VoucherChip } from "@/components/ui/freebiz-voucher-chip";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeadCell,
  TableCell,
} from "@/components/ui/freebiz-table";
import { routes } from "@/app/_utils/routes";
import { ApplyCodeResponse, Claim } from "@/types";

// design/freebiz-mockup.html data-screen="v-freebies". GET /me/claims items
// now carry publicCode? (docs/FRONTEND_IMPLEMENTATION_GUIDE.md §2 Revamp 6)
// — the board code as it appeared when won — restoring the mockup's
// "Public code" column as a small reference label; secretCode is still what
// actually redeems. Everything else (stats, "ready to reveal" count, the
// revealed-PIN panel, "Show again") comes straight from the existing claims
// list and the existing redeem mutation; re-redeeming an already-REDEEMED
// claim is documented as idempotent (BUSINESS_RULES.md), so "Show again"
// just calls the same mutation again instead of needing a new endpoint.
export default function ClaimsPage() {
  const user = useAtomValue(userAtom);
  const { data: claims, isLoading } = useMyClaims(!!user?.accessToken);
  const redeemMutation = useRedeemClaim();
  const [revealed, setRevealed] = useState<{ claimId: string; data: ApplyCodeResponse } | null>(null);

  const stats = useMemo(() => {
    const list = claims ?? [];
    const sum = (type: Claim["type"]) =>
      list
        .filter((c) => c.type === type && c.status === "REDEEMED")
        .reduce((total, c) => total + (c.value ?? 0), 0);
    return {
      caught: list.length,
      cashWon: sum("CASH"),
      airtimeWon: sum("AIRTIME"),
      readyToReveal: list.filter((c) => c.status === "ISSUED").length,
    };
  }, [claims]);

  const handleRedeem = (claim: Claim) => {
    redeemMutation.mutate(claim.claimId, {
      onSuccess: (data) => setRevealed({ claimId: claim.claimId, data }),
    });
  };

  if (isLoading) return <PageLoader withLayout={false} message="Loading your claims..." />;

  const list = claims ?? [];

  const statusPill = (claim: Claim) => {
    if (claim.status === "VOID") return <Pill tone="bad" dot>Voided</Pill>;
    if (claim.status === "REDEEMED") {
      return (
        <Pill tone="live" dot>
          {claim.type === "CASH" ? "In wallet" : "Revealed"}
        </Pill>
      );
    }
    return <Pill tone="warn" dot>Not revealed</Pill>;
  };

  // claim.type === "AIRTIME" branches below are legacy-only (freebies went
  // cash-only 2026-08-29) — kept so a claim won before the cutover still
  // redeems/reveals correctly forever.
  const actionButton = (claim: Claim) => {
    const pending = redeemMutation.isPending && redeemMutation.variables === claim.claimId;
    if (claim.status === "ISSUED") {
      return (
        <Button size="sm" variant="primary" disabled={pending} onClick={() => handleRedeem(claim)}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : claim.type === "AIRTIME" ? "Reveal PIN" : "Redeem to wallet"}
        </Button>
      );
    }
    if (claim.status === "REDEEMED" && claim.type === "AIRTIME") {
      return (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => handleRedeem(claim)}>
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Show again"}
        </Button>
      );
    }
    if (claim.status === "REDEEMED" && claim.type === "CASH") {
      return (
        <Link href={routes.USER.WALLET}>
          <Button size="sm" variant="ghost">
            View wallet
          </Button>
        </Link>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p
            style={{
              fontFamily: "var(--mono)",
              fontSize: 10.5,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--faint)",
            }}>
            Viewers / My freebies
          </p>
          <h1
            className="mt-1"
            style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
            Everything you&apos;ve caught
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Nothing here expires — redeem as many codes as you&apos;ve won.
          </p>
        </div>
        {stats.readyToReveal > 0 && (
          <Pill tone="live" dot>
            {stats.readyToReveal} ready to reveal
          </Pill>
        )}
      </div>

      <div className={`grid grid-cols-1 gap-4 ${stats.airtimeWon > 0 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        <Stat label="Caught all time" value={stats.caught} />
        <Stat label="Cash won" value={`₦${stats.cashWon.toLocaleString()}`} detail="Sitting in your wallet" />
        {/* Legacy-only tile: freebies went cash-only 2026-08-29, so this
            only ever shows for accounts with airtime wins from before then. */}
        {stats.airtimeWon > 0 && <Stat label="Airtime won" value={`₦${stats.airtimeWon.toLocaleString()}`} />}
      </div>

      {revealed?.data.action === "REDEEMED" && revealed.data.type === "AIRTIME" && (
        <Card
          style={{
            borderColor: "rgba(61,220,151,.32)",
            background: "linear-gradient(140deg, rgba(61,220,151,.1), transparent 60%), var(--ink-800)",
          }}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)" }}>
                Revealed PIN
              </p>
              <p className="mt-1.5" style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 19, letterSpacing: "0.05em", color: "var(--live)" }}>
                {revealed.data.display}
              </p>
              <p className="mt-2" style={{ fontSize: 11.5, color: "var(--faint)" }}>
                This PIN belongs to you and will not expire.
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigator.clipboard?.writeText(revealed.data.action === "REDEEMED" && revealed.data.type === "AIRTIME" ? revealed.data.rechargeString : "")}>
              Copy PIN
            </Button>
          </div>
        </Card>
      )}

      {list.length === 0 ? (
        <Card>
          <CardNote>
            No freebie codes claimed yet — catch one on{" "}
            <Link href={routes.WATCH} style={{ color: "var(--accent)" }}>
              the Billboard
            </Link>
            .
          </CardNote>
        </Card>
      ) : (
        <>
          {/* Desktop: table. CLAUDE-UI.md — tables become cards below 768px,
              never a horizontally scrolling table — so this is hidden on
              small screens in favour of the card list below. */}
          <Card tight className="hidden md:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Freebie</TableHeadCell>
                  <TableHeadCell>Public code</TableHeadCell>
                  <TableHeadCell>Your secret code</TableHeadCell>
                  <TableHeadCell>Caught</TableHeadCell>
                  <TableHeadCell>Status</TableHeadCell>
                  <TableHeadCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {list.map((claim) => (
                  <TableRow key={claim.claimId}>
                    <TableCell>
                      <b style={{ color: "var(--txt)" }}>{claim.valueLabel ?? `${claim.type} freebie`}</b>
                    </TableCell>
                    <TableCell className="fb-hint" style={{ fontFamily: "var(--mono)" }}>
                      {claim.publicCode ?? "—"}
                    </TableCell>
                    <TableCell>{claim.secretCode ? <VoucherChip code={claim.secretCode} /> : "—"}</TableCell>
                    <TableCell className="fb-hint">
                      {claim.issuedAt ? new Date(claim.issuedAt).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>{statusPill(claim)}</TableCell>
                    <TableCell style={{ textAlign: "right" }}>{actionButton(claim)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {list.map((claim) => (
              <Card key={claim.claimId} tight>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <b style={{ color: "var(--txt)", fontSize: 13.5 }}>
                      {claim.valueLabel ?? `${claim.type} freebie`}
                    </b>
                    <div className="fb-hint mt-0.5">
                      {claim.publicCode && <span style={{ fontFamily: "var(--mono)" }}>{claim.publicCode} · </span>}
                      {claim.issuedAt ? new Date(claim.issuedAt).toLocaleString() : "—"}
                    </div>
                  </div>
                  {statusPill(claim)}
                </div>
                <div className="flex items-center justify-between gap-2 mt-2.5">
                  {claim.secretCode ? <VoucherChip code={claim.secretCode} /> : <span />}
                  {actionButton(claim)}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
