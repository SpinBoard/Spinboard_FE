"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Stat } from "@/components/ui/freebiz-stat";
import { Pill } from "@/components/ui/freebiz-pill";
import { Button } from "@/components/ui/freebiz-button";
import { Field } from "@/components/ui/freebiz-field";
import { Input, Textarea } from "@/components/ui/freebiz-input";
import { LimitRow } from "@/components/ui/freebiz-limit-row";
import {
  Plus,
  Loader2,
  X,
  AlertTriangle,
  Eye,
  Ban,
  Zap,
  Search,
} from "lucide-react";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { useAdminConfig } from "@/hooks/use-admin-config";
import { useStripFeed } from "@/hooks/use-freebies";
import { apiErrorMessage } from "@/app/_utils/helper";
import { FreebiePrizeStatus } from "@/types";
import {
  useAdminFreebiePrizes,
  useAdminFreebieLowInventory,
  useAdminFreebieSchedule,
  useAddCashPrizes,
  useVoidFreebiePrize,
  useRevealFreebiePin,
  useGenerateFreebieSchedule,
  useCancelFreebieSchedule,
  useForceFreebieLive,
} from "@/hooks/use-admin-freebies";

const PRIZE_STATUS_FILTERS = ["all", "PENDING", "ASSIGNED", "CLAIMED", "REDEEMED", "EXHAUSTED", "VOID"] as const;

// The only denominations offered since freebies went cash-only 2026-08-29.
const CASH_DENOMINATIONS = [50, 100, 200, 500, 1000] as const;

const RESOLVED_CODE_STATUS_TONE: Record<"AVAILABLE" | "TAKEN" | "ROTATED", "live" | "warn" | "default"> = {
  AVAILABLE: "live",
  TAKEN: "warn",
  ROTATED: "default",
};

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatNaira(value: number): string {
  return `₦${value.toLocaleString()}`;
}

function scheduleSlotDisplay(slot: {
  status: "PENDING" | "FIRED" | "CANCELLED";
  resolvedCode: { status: "AVAILABLE" | "TAKEN" | "ROTATED" } | null;
}): { tone: "live" | "warn" | "bad" | "default"; label: string } {
  if (slot.status === "PENDING") return { tone: "warn", label: "Pending" };
  if (slot.status === "CANCELLED") return { tone: "bad", label: "Cancelled" };
  if (!slot.resolvedCode) return { tone: "default", label: "Fired" };
  const label = { AVAILABLE: "Live, unclaimed", TAKEN: "Claimed", ROTATED: "Rotated" }[slot.resolvedCode.status];
  return { tone: RESOLVED_CODE_STATUS_TONE[slot.resolvedCode.status], label };
}

// design/freebiz-mockup.html data-screen="a-prizes", route admin/freebies.
// Backed by the real admin freebie-prize/schedule endpoints
// (docs/API_GUIDE.md "Admin: freebie prize inventory" / "...schedule &
// phrases") — every request/response shape here, including the 7 writes,
// was verified against a live instance on 2026-08-29 (see src/types/index.ts
// for what changed from the pre-verification guess).
//
// Two real backend bugs/gaps were found during that pass and are both now
// confirmed FIXED (re-verified live, same day):
// 1. GET /admin/freebie-prizes (the list this page's inventory table reads)
//    was returning an empty array unconditionally — fixed; re-verified with
//    an unfiltered call and with type/status filters individually.
// 2. The schedule endpoint used to only carry a bare freebieCodeId pointer
//    once a slot fired, with no way to resolve it — fixed by inlining
//    `resolvedCode` on each slot (null until FIRED), so the table below now
//    shows the real public code/value/status/taken-by, not a raw id.
//
// "Live on the board" is still computed from the public strip feed rather
// than the schedule — it's the more direct source for "what's live right
// now" regardless of which mechanism (schedule fire vs. force-live) put it
// there.
//
// Simplified to cash-only 2026-08-29 (freebie.dailyAirtimeCount is 0
// server-side) — denominations are fixed to CASH_DENOMINATIONS above. The
// airtime PIN-import flow, the per-type Force-live choice, and the type
// filter were all removed since there's nothing to create/pick between
// going forward. Void and Reveal-PIN stay available for any of the 10
// legacy airtime prizes still sitting in the database from before the
// cutover — that's cleanup of existing stock, not new airtime offering.
export default function AdminFreebiesPage() {
  const { get } = useAdminConfig();
  const [date, setDate] = useState(todayStr());
  const [statusFilter, setStatusFilter] = useState<FreebiePrizeStatus | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddCash, setShowAddCash] = useState(false);
  const [cashRows, setCashRows] = useState<{ value: (typeof CASH_DENOMINATIONS)[number]; quantity: string }[]>([
    { value: 100, quantity: "1" },
  ]);
  const [scheduleReasonId, setScheduleReasonId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [voidTarget, setVoidTarget] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [revealedPin, setRevealedPin] = useState<{ prizeItemId: string; pin: string; rechargeString?: string } | null>(null);

  const {
    data: prizes,
    error: prizesError,
    isLoading: loadingPrizes,
  } = useAdminFreebiePrizes({ status: statusFilter });
  const { data: lowInventory } = useAdminFreebieLowInventory();
  const { data: schedule, isLoading: loadingSchedule } = useAdminFreebieSchedule(date);
  const { data: stripFeed } = useStripFeed();

  const addCash = useAddCashPrizes();
  const voidPrize = useVoidFreebiePrize();
  const revealPin = useRevealFreebiePin();
  const generateSchedule = useGenerateFreebieSchedule();
  const cancelSchedule = useCancelFreebieSchedule(date);
  const forceLive = useForceFreebieLive(date);

  const filteredPrizes = useMemo(() => {
    if (!prizes) return [];
    if (!searchQuery.trim()) return prizes;
    const q = searchQuery.toLowerCase();
    return prizes.filter(
      (p) => p._id.toLowerCase().includes(q) || p.batchId.toLowerCase().includes(q) || p.carrier?.toLowerCase().includes(q)
    );
  }, [prizes, searchQuery]);

  const stats = useMemo(() => {
    const list = prizes ?? [];
    const cashInStock = list.filter((p) => p.type === "CASH" && p.status === "PENDING");
    const cashInStockValue = cashInStock.reduce((sum, p) => sum + p.value, 0);
    const liveNow = (stripFeed?.items ?? []).filter((i) => i.kind === "FREEBIE" && i.state === "AVAILABLE").length;
    return { cashInStockCount: cashInStock.length, cashInStockValue, liveNow };
  }, [prizes, stripFeed]);

  const handleAddCash = () => {
    const parsed = cashRows.flatMap((r) => {
      const qty = Math.max(0, Math.floor(Number(r.quantity) || 0));
      return Array.from({ length: qty }, () => ({ value: r.value, currency: "NGN" }));
    });
    if (parsed.length === 0) {
      toast.error("Add at least one prize with a quantity greater than 0.");
      return;
    }
    addCash.mutate(
      { prizes: parsed },
      {
        onSuccess: (data) => {
          toast.success(`Added ${data.count} cash prize(s) to stock.`);
          setCashRows([{ value: 100, quantity: "1" }]);
          setShowAddCash(false);
        },
        onError: (error) => toast.error(apiErrorMessage(error, "Failed to add cash prizes.")),
      }
    );
  };

  const handleVoid = () => {
    if (!voidTarget) return;
    if (!voidReason.trim()) {
      toast.error("A reason is required to void a prize.");
      return;
    }
    voidPrize.mutate(
      { prizeItemId: voidTarget, reason: voidReason.trim() },
      {
        onSuccess: () => {
          toast.success("Prize voided.");
          setVoidTarget(null);
          setVoidReason("");
        },
        onError: (error) => toast.error(apiErrorMessage(error, "Failed to void this prize.")),
      }
    );
  };

  const handleReveal = (prizeItemId: string) => {
    revealPin.mutate(prizeItemId, {
      onSuccess: (data) => setRevealedPin({ prizeItemId, pin: data.pin, rechargeString: data.rechargeString }),
      onError: (error) => toast.error(apiErrorMessage(error, "Failed to reveal this PIN.")),
    });
  };

  const handleGenerate = () => {
    generateSchedule.mutate(date, {
      onSuccess: (data) => toast.success(`Generated ${data.created} drop(s) for ${data.date}.`),
      onError: (error) => toast.error(apiErrorMessage(error, "Failed to generate a schedule for this date.")),
    });
  };

  const handleCancelSchedule = () => {
    if (!scheduleReasonId) return;
    if (!cancelReason.trim()) {
      toast.error("A reason is required to cancel a scheduled drop.");
      return;
    }
    cancelSchedule.mutate(
      { scheduleId: scheduleReasonId, reason: cancelReason.trim() },
      {
        onSuccess: () => {
          toast.success("Drop cancelled.");
          setScheduleReasonId(null);
          setCancelReason("");
        },
        onError: (error) => toast.error(apiErrorMessage(error, "Failed to cancel this drop.")),
      }
    );
  };

  const handleForceLive = () => {
    forceLive.mutate("CASH", {
      onSuccess: (data) => toast.success(`${data.code.publicCode} is now live — ${data.code.valueLabel}.`),
      onError: (error) => toast.error(apiErrorMessage(error, "Failed to force a code live — check spacing/concurrency limits.")),
    });
  };

  if (loadingPrizes) return <PageLoader withLayout={false} message="Loading freebie inventory..." />;

  if (prizesError) {
    return (
      <PageError
        withLayout={false}
        title="Failed to Load Inventory"
        message="Unable to load freebie prize inventory. Please check your connection and try again."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)" }}>
            Admin / Freebie inventory
          </p>
          <h1 className="mt-1" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
            Freebie inventory
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Add cash prizes, then spread them across the day. The board drops them between ads.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="primary" onClick={() => setShowAddCash((v) => !v)}>
            <Plus className="h-4 w-4" />
            Add cash prizes
          </Button>
        </div>
      </div>

      {lowInventory && lowInventory.length > 0 && (
        <Card style={{ borderColor: "rgba(255,210,63,.35)", background: "rgba(255,210,63,.08)" }}>
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "var(--free)" }} />
            <div>
              <b style={{ fontSize: 13.5, color: "var(--txt)" }}>Low inventory</b>
              <ul className="mt-1" style={{ fontSize: 12.5, color: "var(--muted)", listStyle: "disc", paddingLeft: 18 }}>
                {lowInventory.map((a, i) => (
                  <li key={i}>Cash: {a.inStock} in stock, target {a.dailyTarget}/day</li>
                ))}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Cash prizes in stock" value={stats.cashInStockCount} detail={formatNaira(stats.cashInStockValue)} />
        <Stat label="Live on the board" value={stats.liveNow} valueColor={stats.liveNow > 0 ? "var(--live)" : undefined} />
        <Stat label="Drop rules" value={get("freebie.dailyCashCount")} detail="cash drops / day" />
      </div>

      {showAddCash && (
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Add cash prizes</h3>
              <p className="fb-hint mt-1">Pick a denomination and how many — each one becomes a separate prize in stock, ready to schedule.</p>
            </div>
            <button onClick={() => setShowAddCash(false)} aria-label="Close" style={{ color: "var(--faint)" }}>
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 space-y-2">
            {cashRows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <Field label={i === 0 ? "Denomination" : undefined} className="flex-1">
                  <select
                    className="fb-input"
                    value={row.value}
                    onChange={(e) => {
                      const next = [...cashRows];
                      next[i] = { ...next[i], value: Number(e.target.value) as (typeof CASH_DENOMINATIONS)[number] };
                      setCashRows(next);
                    }}>
                    {CASH_DENOMINATIONS.map((d) => (
                      <option key={d} value={d}>
                        {formatNaira(d)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label={i === 0 ? "Quantity" : undefined} style={{ width: 100 }}>
                  <Input
                    type="number"
                    min={1}
                    value={row.quantity}
                    onChange={(e) => {
                      const next = [...cashRows];
                      next[i] = { ...next[i], quantity: e.target.value };
                      setCashRows(next);
                    }}
                  />
                </Field>
                {cashRows.length > 1 && (
                  <button
                    onClick={() => setCashRows(cashRows.filter((_, idx) => idx !== i))}
                    aria-label="Remove row"
                    style={{ color: "var(--faint)", marginTop: i === 0 ? 24 : 0 }}>
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3">
            <Button variant="ghost" size="sm" onClick={() => setCashRows([...cashRows, { value: 100, quantity: "1" }])}>
              <Plus className="h-3.5 w-3.5" />
              Add row
            </Button>
            <Button variant="primary" size="sm" disabled={addCash.isPending} onClick={handleAddCash}>
              {addCash.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {(() => {
                const total = cashRows.reduce((sum, r) => sum + Math.max(0, Math.floor(Number(r.quantity) || 0)), 0);
                return `Add ${total} prize${total !== 1 ? "s" : ""}`;
              })()}
            </Button>
          </div>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Today&apos;s schedule</h3>
            <p className="fb-hint mt-1">Drops are spread across the day so the board never feels empty.</p>
          </div>
          <div className="flex items-center gap-2">
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 150 }} />
            <Button variant="ghost" size="sm" disabled={generateSchedule.isPending} onClick={handleGenerate}>
              {generateSchedule.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Generate schedule
            </Button>
            <Button variant="ghost" size="sm" disabled={forceLive.isPending} onClick={handleForceLive}>
              <Zap className="h-3.5 w-3.5" />
              Force live
            </Button>
          </div>
        </div>

        {loadingSchedule ? (
          <div className="mt-4 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--faint)" }} />
          </div>
        ) : !schedule || schedule.length === 0 ? (
          <CardNote className="mt-3">No drops scheduled for this date yet.</CardNote>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr style={{ color: "var(--faint)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <th className="text-left pb-2">Public code</th>
                  <th className="text-left pb-2">Freebie</th>
                  <th className="text-left pb-2">Scheduled / live</th>
                  <th className="text-left pb-2">Taken by</th>
                  <th className="text-left pb-2">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((slot) => {
                  const display = scheduleSlotDisplay(slot);
                  return (
                    <tr key={slot._id} style={{ borderTop: "1px solid var(--line)" }}>
                      <td className="py-2" style={{ fontFamily: "var(--mono)", color: display.tone === "live" ? "var(--live)" : "var(--faint)" }}>
                        {slot.resolvedCode?.publicCode ?? "—"}
                      </td>
                      <td className="py-2" style={{ color: "var(--txt)" }}>
                        <b>{slot.resolvedCode?.valueLabel ?? (slot.type === "AIRTIME" ? "Airtime" : "Cash")}</b>
                      </td>
                      <td className="py-2 fb-hint">
                        {slot.resolvedCode
                          ? `${formatTime(slot.resolvedCode.liveFrom)}–${formatTime(slot.resolvedCode.liveUntil)}`
                          : formatTime(slot.scheduledFor)}
                      </td>
                      <td className="py-2 fb-hint">{slot.resolvedCode?.takenBy ?? "—"}</td>
                      <td className="py-2">
                        <Pill tone={display.tone} dot={display.tone === "live" ? "pulse" : true}>
                          {display.label}
                        </Pill>
                      </td>
                      <td className="py-2 text-right">
                        {slot.status === "PENDING" && (
                          <Button size="sm" variant="ghost" onClick={() => setScheduleReasonId(slot._id)}>
                            <Ban className="h-3.5 w-3.5" />
                            Cancel
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {scheduleReasonId && (
          <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
            <Field label="Reason (required to cancel this drop)">
              <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} rows={2} placeholder="e.g. Duplicate entry" />
            </Field>
            <div className="flex items-center gap-2 mt-2">
              <Button variant="danger" size="sm" disabled={cancelSchedule.isPending} onClick={handleCancelSchedule}>
                {cancelSchedule.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Confirm cancel
              </Button>
              <Button variant="ghost" size="sm" onClick={() => { setScheduleReasonId(null); setCancelReason(""); }}>
                Back
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div className="flex flex-wrap items-center gap-2">
        <Field label="Search" className="w-full sm:max-w-xs">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--faint)" }} />
            <Input placeholder="Search by id, batch, carrier..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingLeft: 34 }} />
          </div>
        </Field>
        <div className="flex flex-wrap gap-2 sm:mt-6">
          {PRIZE_STATUS_FILTERS.map((key) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`fb-pill${statusFilter === key ? " fb-pill--live" : ""}`}
              style={{ cursor: "pointer" }}>
              {key === "all" ? "All statuses" : key.charAt(0) + key.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <Card tight>
        {filteredPrizes.length === 0 ? (
          <CardNote>
            {searchQuery || statusFilter !== "all"
              ? "No prizes match your search or filters."
              : "No prizes loaded yet — add cash prizes above."}
          </CardNote>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full" style={{ fontSize: 13 }}>
              <thead>
                <tr style={{ color: "var(--faint)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  <th className="text-left px-3 pt-2 pb-1.5">Value</th>
                  <th className="text-left px-3 pt-2 pb-1.5">Type</th>
                  <th className="text-left px-3 pt-2 pb-1.5">Batch</th>
                  <th className="text-left px-3 pt-2 pb-1.5">Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredPrizes.map((prize) => (
                  <tr key={prize._id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td className="px-3 py-2">
                      <b style={{ color: "var(--txt)" }}>
                        {prize.type === "CASH" ? formatNaira(prize.value) : `${formatNaira(prize.value)} Airtime`}
                      </b>
                      {prize.carrier && <div className="fb-hint">{prize.carrier}{prize.country ? ` · ${prize.country}` : ""}</div>}
                    </td>
                    <td className="px-3 py-2 fb-hint">{prize.type === "AIRTIME" ? "Airtime" : "Cash"}</td>
                    <td className="px-3 py-2 fb-hint" style={{ fontFamily: "var(--mono)" }}>{prize.batchId}</td>
                    <td className="px-3 py-2">
                      <Pill tone={prize.status === "VOID" ? "bad" : prize.status === "PENDING" ? "default" : "info"}>
                        {prize.status.charAt(0) + prize.status.slice(1).toLowerCase()}
                      </Pill>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {prize.type === "AIRTIME" && prize.status !== "VOID" && prize.status !== "EXHAUSTED" && (
                          <Button size="sm" variant="ghost" disabled={revealPin.isPending} onClick={() => handleReveal(prize._id)}>
                            <Eye className="h-3.5 w-3.5" />
                            Reveal PIN
                          </Button>
                        )}
                        {(prize.status === "PENDING" || prize.status === "ASSIGNED") && (
                          <Button size="sm" variant="ghost" onClick={() => setVoidTarget(prize._id)}>
                            <Ban className="h-3.5 w-3.5" />
                            Void
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {voidTarget && (
        <Card style={{ borderColor: "rgba(255,77,94,.3)" }}>
          <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Void this prize</h3>
          <p className="fb-hint mt-1">It&apos;s removed from stock permanently and can&apos;t be scheduled. This can&apos;t be undone.</p>
          <Field label="Reason (required)" className="mt-3">
            <Textarea value={voidReason} onChange={(e) => setVoidReason(e.target.value)} rows={2} placeholder="e.g. Duplicate PIN, entered in error" />
          </Field>
          <div className="flex items-center gap-2 mt-3">
            <Button variant="danger" disabled={voidPrize.isPending} onClick={handleVoid}>
              {voidPrize.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Confirm void
            </Button>
            <Button variant="ghost" onClick={() => { setVoidTarget(null); setVoidReason(""); }}>
              Cancel
            </Button>
          </div>
        </Card>
      )}

      {revealedPin && (
        <Card style={{ borderColor: "rgba(255,210,63,.35)" }}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>PIN revealed</h3>
              <p className="fb-hint mt-1">This reveal was audit-logged. Close this once you&apos;re done — it isn&apos;t saved on screen.</p>
              <p className="mt-2" style={{ fontFamily: "var(--mono)", fontSize: 18, color: "var(--txt)" }}>{revealedPin.pin}</p>
              {revealedPin.rechargeString && <p className="fb-hint mt-1" style={{ fontFamily: "var(--mono)" }}>{revealedPin.rechargeString}</p>}
            </div>
            <button onClick={() => setRevealedPin(null)} aria-label="Close" style={{ color: "var(--faint)" }}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </Card>
      )}

      <Card>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Drop rules</h3>
        <div className="mt-2.5">
          <LimitRow label="Cash drops / day" value={get("freebie.dailyCashCount")} />
          <LimitRow label="Active hours" value={`${get("freebie.activeHours").start}–${get("freebie.activeHours").end} ${get("freebie.activeHours").timeZone}`} />
          <LimitRow label="Min gap between drops" value={`${get("freebie.minGapMinutes")} min`} />
          <LimitRow label="Max concurrent live" value={get("freebie.maxConcurrentLive")} />
        </div>
        <p className="fb-hint mt-2">
          These are set server-side (Config: freebie.*) — edit them from the backend config store, not here.
        </p>
      </Card>
    </div>
  );
}
