"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Download, Lock, CheckCircle2, Loader2, Plus, XCircle, SkipForward } from "lucide-react";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Pill } from "@/components/ui/freebiz-pill";
import { Button } from "@/components/ui/freebiz-button";
import { Field } from "@/components/ui/freebiz-field";
import { Input } from "@/components/ui/freebiz-input";
import { Stat } from "@/components/ui/freebiz-stat";
import {
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeadCell,
  TableCell,
} from "@/components/ui/freebiz-table";
import { PageLoader } from "@/components/ui/page-loader";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { apiErrorMessage } from "@/app/_utils/helper";
import {
  useAdminPayoutRuns,
  useOpenPayoutRun,
  usePayoutRunItems,
  useLockPayoutRun,
  useMarkPayoutItemPaid,
  useMarkPayoutItemsPaidBulk,
  useSkipPayoutItem,
  useFailPayoutItem,
  useCompletePayoutRun,
} from "@/hooks/use-payout-runs";
import { PayoutRunStatus, PayoutRunItemStatus } from "@/types";

const RUN_STATUS_TONE: Record<PayoutRunStatus, "live" | "warn" | "default" | "bad" | "info"> = {
  DRAFT: "warn",
  LOCKED: "info",
  COMPLETED: "live",
  CANCELLED: "bad",
};

const ITEM_STATUS_TONE: Record<PayoutRunItemStatus, "live" | "warn" | "default" | "bad"> = {
  PENDING: "warn",
  PAID: "live",
  SKIPPED: "default",
  FAILED: "bad",
};

function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString()}`;
}

// New — the highest-priority unbuilt admin screen per design/DECISIONS.md
// (a-payouts): the backend's admin/payout-runs* has been ready for a while,
// and until this screen existed someone was settling weekly cash-outs by
// hand against a database. Built against the real period-based run/item
// API, not the mockup's "verify a secret code" mechanic — see the header
// comment on the PayoutRun/PayoutRunItem types for why those diverge.
export default function AdminPayoutsPage() {
  const { data: runsData, isLoading: loadingRuns } = useAdminPayoutRuns();
  const openRun = useOpenPayoutRun();
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  const runs = runsData?.runs ?? [];
  const focusedRun = runs.find((r) => r._id === selectedRunId) ?? runs[0] ?? null;

  const { data: items, isLoading: loadingItems } = usePayoutRunItems(focusedRun?._id ?? null);
  const lockRun = useLockPayoutRun();
  const completeRun = useCompletePayoutRun();
  const markPaid = useMarkPayoutItemPaid(focusedRun?._id ?? "");
  const markPaidBulk = useMarkPayoutItemsPaidBulk(focusedRun?._id ?? "");
  const skipItem = useSkipPayoutItem(focusedRun?._id ?? "");
  const failItem = useFailPayoutItem(focusedRun?._id ?? "");

  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [reasonDraft, setReasonDraft] = useState<Record<string, string>>({});
  const [exporting, setExporting] = useState(false);

  const toggleItemSelected = (id: string) => {
    setSelectedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOpenRun = () => {
    if (!periodStart || !periodEnd) {
      toast.error("Both period dates are required.");
      return;
    }
    openRun.mutate(
      { periodStart: new Date(periodStart).toISOString(), periodEnd: new Date(periodEnd).toISOString() },
      {
        onSuccess: (run) => {
          toast.success(`Run opened — ${run.userCount} wallet${run.userCount !== 1 ? "s" : ""}, ${formatCurrency(run.totalAmount)}.`);
          setSelectedRunId(run._id);
          setPeriodStart("");
          setPeriodEnd("");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Failed to open a payout run.")),
      }
    );
  };

  const handleLock = () => {
    if (!focusedRun) return;
    lockRun.mutate(focusedRun._id, {
      onSuccess: () => toast.success("Locked — amounts are frozen. A later credit rolls to the next run."),
      onError: (err) => toast.error(apiErrorMessage(err, "Failed to lock this run.")),
    });
  };

  const handleComplete = () => {
    if (!focusedRun) return;
    completeRun.mutate(focusedRun._id, {
      onSuccess: () => toast.success("Run completed."),
      onError: (err) => toast.error(apiErrorMessage(err, "Every item needs to be paid, skipped, or failed before completing.")),
    });
  };

  const handleMarkPaid = (itemId: string) => {
    markPaid.mutate(
      { itemId },
      {
        onSuccess: () => toast.success("Marked paid."),
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't mark this item paid.")),
      }
    );
  };

  const handleMarkPaidBulk = () => {
    if (selectedItemIds.size === 0) return;
    markPaidBulk.mutate(
      { itemIds: Array.from(selectedItemIds) },
      {
        onSuccess: () => {
          toast.success(`Marked ${selectedItemIds.size} item(s) paid.`);
          setSelectedItemIds(new Set());
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't mark these items paid.")),
      }
    );
  };

  const handleSkip = (itemId: string) => {
    const reason = reasonDraft[itemId]?.trim();
    if (!reason) {
      toast.error("A reason is required to skip an item.");
      return;
    }
    skipItem.mutate(
      { itemId, reason },
      {
        onSuccess: () => toast.success("Skipped."),
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't skip this item.")),
      }
    );
  };

  const handleFail = (itemId: string) => {
    const reason = reasonDraft[itemId]?.trim();
    if (!reason) {
      toast.error("A reason is required to fail an item.");
      return;
    }
    failItem.mutate(
      { itemId, reason },
      {
        onSuccess: () => toast.success("Marked failed."),
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't fail this item.")),
      }
    );
  };

  const handleExport = async () => {
    if (!focusedRun) return;
    setExporting(true);
    try {
      const res = await api.get(ENDPOINTS.ADMIN_PAYOUT_RUN_EXPORT(focusedRun._id), { responseType: "blob" });
      const url = URL.createObjectURL(new Blob([res.data as BlobPart]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `payout-run-${focusedRun._id}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't export this run.");
    } finally {
      setExporting(false);
    }
  };

  if (loadingRuns) return <PageLoader withLayout={false} message="Loading payout runs..." />;

  const pendingCount = items?.filter((i) => i.status === "PENDING").length ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)" }}>
            Admin / Payout desk
          </p>
          <h1 className="mt-1" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
            Payout desk
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Open a run for a period, work through the wallets it snapshots, lock the amounts, then
            complete it once every item is resolved.
          </p>
        </div>
        <Pill tone="warn" dot>Outstanding: {formatCurrency(runsData?.outstandingLiability ?? 0)}</Pill>
      </div>

      <Card>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Open a new run</h3>
        <p className="fb-hint mt-1">Snapshots every wallet at or above the payout threshold for this period.</p>
        <div className="flex flex-wrap items-end gap-2 mt-3">
          <Field label="Period start" className="flex-1 min-w-[160px]">
            <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
          </Field>
          <Field label="Period end" className="flex-1 min-w-[160px]">
            <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
          </Field>
          <Button variant="primary" disabled={openRun.isPending} onClick={handleOpenRun}>
            {openRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Open run
          </Button>
        </div>
      </Card>

      {runs.length === 0 ? (
        <Card><CardNote>No payout runs yet.</CardNote></Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4 items-start">
          <Card tight className="lg:max-h-[640px] lg:overflow-y-auto">
            <p className="fb-hint px-3 pt-2 pb-1">Runs ({runs.length})</p>
            <div>
              {runs.map((run) => (
                <div
                  key={run._id}
                  className="px-3 py-2.5 cursor-pointer"
                  style={{
                    borderTop: "1px solid var(--line)",
                    background: focusedRun?._id === run._id ? "var(--accent-soft)" : undefined,
                  }}
                  onClick={() => { setSelectedRunId(run._id); setSelectedItemIds(new Set()); }}>
                  <div className="flex items-center justify-between gap-2">
                    <b style={{ fontSize: 13, color: "var(--txt)" }}>
                      {new Date(run.periodStart).toLocaleDateString()} – {new Date(run.periodEnd).toLocaleDateString()}
                    </b>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Pill tone={RUN_STATUS_TONE[run.status]} dot>{run.status}</Pill>
                    <span className="fb-hint">{formatCurrency(run.totalAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {focusedRun && (
            <div className="space-y-4 min-w-0">
              <Card>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 style={{ fontFamily: "var(--display)", fontSize: 16, color: "var(--txt)" }}>
                      {new Date(focusedRun.periodStart).toLocaleDateString()} – {new Date(focusedRun.periodEnd).toLocaleDateString()}
                    </h3>
                    <p className="fb-hint mt-1">
                      {focusedRun.lockedAt && `Locked ${new Date(focusedRun.lockedAt).toLocaleDateString()}`}
                      {focusedRun.completedAt && ` · Completed ${new Date(focusedRun.completedAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <Pill tone={RUN_STATUS_TONE[focusedRun.status]} dot>{focusedRun.status}</Pill>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-3">
                  <Stat label="Wallets" value={focusedRun.userCount} />
                  <Stat label="Total" value={formatCurrency(focusedRun.totalAmount)} />
                  <Stat label="Still pending" value={pendingCount} valueColor={pendingCount > 0 ? "var(--spent)" : "var(--live)"} />
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
                  <Button variant="ghost" disabled={exporting} onClick={handleExport}>
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Export CSV
                  </Button>
                  {focusedRun.status === "DRAFT" && (
                    <Button variant="ghost" disabled={lockRun.isPending} onClick={handleLock}>
                      {lockRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                      Lock amounts
                    </Button>
                  )}
                  {focusedRun.status === "LOCKED" && (
                    <Button variant="primary" disabled={completeRun.isPending} onClick={handleComplete}>
                      {completeRun.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Complete run
                    </Button>
                  )}
                </div>
              </Card>

              {selectedItemIds.size > 0 && (
                <Card tight>
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">
                    <span style={{ fontSize: 13, color: "var(--txt)" }}>{selectedItemIds.size} selected</span>
                    <Button size="sm" variant="primary" disabled={markPaidBulk.isPending} onClick={handleMarkPaidBulk}>
                      {markPaidBulk.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                      Mark paid
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setSelectedItemIds(new Set())}>Clear</Button>
                  </div>
                </Card>
              )}

              <Card tight>
                {loadingItems ? (
                  <Loader2 className="h-4 w-4 animate-spin m-3" style={{ color: "var(--muted)" }} />
                ) : !items || items.length === 0 ? (
                  <CardNote className="p-3">No items in this run.</CardNote>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeadCell />
                        <TableHeadCell>Wallet</TableHeadCell>
                        <TableHeadCell style={{ textAlign: "right" }}>Amount</TableHeadCell>
                        <TableHeadCell>Status</TableHeadCell>
                        <TableHeadCell>Reason / reference</TableHeadCell>
                        <TableHeadCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {items.map((item) => (
                        <TableRow key={item._id}>
                          <TableCell>
                            {item.status === "PENDING" && (
                              <input
                                type="checkbox"
                                checked={selectedItemIds.has(item._id)}
                                onChange={() => toggleItemSelected(item._id)}
                              />
                            )}
                          </TableCell>
                          <TableCell className="fb-hint" style={{ fontFamily: "var(--mono)" }}>{item.userId}</TableCell>
                          <TableCell style={{ textAlign: "right", fontFamily: "var(--mono)", color: "var(--txt)" }}>
                            {formatCurrency(item.amount)}
                          </TableCell>
                          <TableCell>
                            <Pill tone={ITEM_STATUS_TONE[item.status]} dot>{item.status}</Pill>
                          </TableCell>
                          <TableCell className="fb-hint">
                            {item.status === "PENDING" ? (
                              <Input
                                placeholder="Reason (for skip/fail)"
                                value={reasonDraft[item._id] ?? ""}
                                onChange={(e) => setReasonDraft((prev) => ({ ...prev, [item._id]: e.target.value }))}
                                style={{ height: 28, fontSize: 11.5, width: 180 }}
                              />
                            ) : (
                              item.reference || item.notes || "—"
                            )}
                          </TableCell>
                          <TableCell style={{ textAlign: "right" }}>
                            {item.status === "PENDING" && (
                              <div className="flex items-center gap-1.5 justify-end">
                                <Button size="sm" variant="primary" disabled={markPaid.isPending} onClick={() => handleMarkPaid(item._id)}>
                                  Paid
                                </Button>
                                <Button size="sm" variant="ghost" disabled={skipItem.isPending} onClick={() => handleSkip(item._id)}>
                                  <SkipForward className="h-3.5 w-3.5" />
                                </Button>
                                <Button size="sm" variant="danger" disabled={failItem.isPending} onClick={() => handleFail(item._id)}>
                                  <XCircle className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
