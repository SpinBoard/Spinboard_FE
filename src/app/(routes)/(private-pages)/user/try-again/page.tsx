"use client";

import { useState } from "react";
import { Loader2, Lock, Sparkles, Trophy } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useTryAgainSpend, useTryAgainStatus, useSpinWinDecision } from "@/hooks/use-spin";
import { OUTCOME_COPY } from "@/components/spin/spin-machine";
import { SpinResponse, TryAgainBenchmark } from "@/types";
import { toast } from "sonner";

const BOARDS: {
  benchmark: TryAgainBenchmark;
  label: string;
  discountLabel: string;
}[] = [
  { benchmark: 50, label: "20% board", discountLabel: "20% off" },
  { benchmark: 100, label: "50% board", discountLabel: "50% off" },
];

export default function TryAgainPage() {
  const { data, isLoading } = useTryAgainStatus(true);
  const spendMutation = useTryAgainSpend();
  const decisionMutation = useSpinWinDecision();
  const [result, setResult] = useState<SpinResponse | null>(null);

  const tryAgainCount = data?.tryAgainCount ?? 0;

  const handleSpend = async (benchmark: TryAgainBenchmark) => {
    try {
      const data = await spendMutation.mutateAsync(benchmark);
      setResult(data);
    } catch {
      toast.error("Couldn't spend your try-agains right now — please try again.");
    }
  };

  const handleDecision = async (decision: "redeem" | "decline") => {
    if (!result) return;
    try {
      await decisionMutation.mutateAsync({ spinResultId: result.spin._id, decision });
      toast.success(decision === "redeem" ? "Discount code redeemed!" : "Discount declined.");
    } catch {
      toast.error("Couldn't save your decision — please try again.");
      return;
    }
    setResult(null);
  };

  return (
    <MainLayout maxWidth="3xl">
      <div className="space-y-6">
        <div>
          <h1 className="font-sora text-2xl sm:text-3xl font-bold text-foreground">
            Try-again boards
          </h1>
          <p className="text-muted-foreground text-sm">
            Every spin that doesn&apos;t win adds to your try-again count. Spend it on a
            guaranteed-win board — no more try-agains possible on these spins.
          </p>
        </div>

        <Card className="bg-card/60 border-border">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current try-again count</p>
              <p className="font-sora text-3xl font-bold text-foreground" data-testid="try-again-count">
                {isLoading ? "..." : tryAgainCount}
              </p>
            </div>
            <Trophy className="h-10 w-10 text-primary" />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BOARDS.map((board) => {
            const eligible = tryAgainCount >= board.benchmark;
            const remainder = tryAgainCount - board.benchmark;
            return (
              <Card
                key={board.benchmark}
                data-testid={`board-${board.benchmark}`}
                className={`border-border ${eligible ? "bg-card/60" : "bg-card/30 opacity-70"}`}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-foreground">
                    {board.label}
                    {!eligible && <Lock className="h-4 w-4 text-muted-foreground" />}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Spend {board.benchmark} try-agains for a guaranteed {board.discountLabel}{" "}
                    code. No try-again outcome possible on this spin.
                  </p>
                  {eligible ? (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Remaining balance after spending: {remainder}
                      </p>
                      <Button
                        onClick={() => handleSpend(board.benchmark)}
                        disabled={spendMutation.isPending}
                        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                        {spendMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        Spend {board.benchmark} &amp; spin
                      </Button>
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Need {board.benchmark - tryAgainCount} more try-agains to unlock.
                    </p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Dialog open={!!result} onOpenChange={(open) => !open && setResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-sora text-2xl">
              {result ? OUTCOME_COPY[result.spin.outcomeType].title : ""}
            </DialogTitle>
            <DialogDescription>
              {result ? OUTCOME_COPY[result.spin.outcomeType].description : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              disabled={decisionMutation.isPending}
              onClick={() => handleDecision("decline")}>
              Decline
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              disabled={decisionMutation.isPending}
              onClick={() => handleDecision("redeem")}>
              {decisionMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Redeem code"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
