"use client";

import { useEffect, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { useRouter } from "next/navigation";
import { Loader2, PartyPopper, RotateCw, Sparkles } from "lucide-react";
import { userAtom } from "@/atom/user";
import { routes } from "@/app/_utils/routes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSpin, useSpinCredit, useSpinWinDecision } from "@/hooks/use-spin";
import { SpinOutcomeType, SpinResponse } from "@/types";
import { toast } from "sonner";
import { isAxiosError } from "axios";
import { SpinWheel, WHEEL_SEGMENTS } from "./spin-wheel";

// Rotates `current` forward to a new angle that lands the given outcome's
// segment under the pointer (fixed at the top), always spinning forward
// by a few extra full turns for a satisfying reveal — never backward, and
// never landing short of a full turn from wherever the wheel already is.
function landingRotation(current: number, outcomeType: SpinOutcomeType) {
  const index = WHEEL_SEGMENTS.findIndex((segment) => segment.type === outcomeType);
  const segmentAngle = 360 / WHEEL_SEGMENTS.length;
  const segmentMid = (index < 0 ? 0 : index) * segmentAngle + segmentAngle / 2;
  const targetMod = (360 - segmentMid) % 360;
  const extraSpins = 4;
  const base = current - (current % 360);
  let target = base + extraSpins * 360 + targetMod;
  if (target <= current) target += 360;
  return target;
}

export const OUTCOME_COPY: Record<SpinOutcomeType, { title: string; description: string }> = {
  cash: { title: "You won cash!", description: "Credited straight to your wallet." },
  brand_product: {
    title: "You won a free product!",
    description: "A brand prize is on its way to you.",
  },
  discount20: {
    title: "20% off!",
    description: "A single-use discount code for the marketplace.",
  },
  discount30: {
    title: "30% off!",
    description: "A single-use discount code for the marketplace.",
  },
  discount50: {
    title: "50% off!",
    description: "A single-use discount code for the marketplace.",
  },
  try_again: {
    title: "So close — try again!",
    description: "No win this time, but every spin brings you closer to a guaranteed board.",
  },
};

// Persistent spin-machine widget. Inactive (yellow) until the viewer earns a
// spin by finishing a 5-ad cycle; flips to active (green) with a celebratory
// pulse, then back to inactive once the spin is resolved (per spec: "the
// interface returns to status quo"). See useSpinCredit for why "active" is
// tracked client-side rather than fetched — the API has no credit-balance
// endpoint, only the cycle-completion signal from the quiz-submit response.
export function SpinMachine() {
  const user = useAtomValue(userAtom);
  const router = useRouter();
  const { hasCredit, setHasCredit } = useSpinCredit();
  const spinMutation = useSpin();
  const decisionMutation = useSpinWinDecision();

  const [phase, setPhase] = useState<"idle" | "spinning">("idle");
  const [result, setResult] = useState<SpinResponse | null>(null);
  const [justActivated, setJustActivated] = useState(false);
  const [rotation, setRotation] = useState(0);
  const prevActive = useRef(hasCredit);

  useEffect(() => {
    if (hasCredit && !prevActive.current) {
      setJustActivated(true);
      const timeout = setTimeout(() => setJustActivated(false), 1800);
      return () => clearTimeout(timeout);
    }
    prevActive.current = hasCredit;
  }, [hasCredit]);

  const handleSpinClick = async () => {
    if (!hasCredit || phase === "spinning") return;

    if (!user) {
      // Spin request must never fire pre-auth — the earned credit stays in
      // localStorage and the server-side anon session cookie, so it's still
      // there once registration + profile completion finish.
      router.push(`${routes.REGISTER}?type=user&returnTo=${encodeURIComponent(routes.WATCH)}`);
      return;
    }

    setPhase("spinning");
    try {
      const data = await spinMutation.mutateAsync();
      setRotation((current) => landingRotation(current, data.spin.outcomeType));
      setResult(data);
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      if (status === 403) {
        const message = isAxiosError(error)
          ? (error.response?.data as { message?: string } | undefined)?.message
          : undefined;
        toast.error(message ?? "Complete your profile before spinning.");
        router.push(routes.USER.PROFILE_COMPLETE);
      } else {
        toast.error("Couldn't spin right now — please try again.");
      }
      setPhase("idle");
      return;
    }
    setPhase("idle");
    setHasCredit(false);
  };

  const closeResult = () => setResult(null);

  // "redeem" resets tryAgainCount to 0 (only for normal, cycle-earned spins
  // — see API_CONTRACT_ADS_REWARD_PLATFORM.md §5); "decline" forfeits the
  // prize and leaves tryAgainCount untouched, i.e. "keep trying" toward the
  // 50/100 guaranteed-win boards.
  const handleDecision = async (decision: "redeem" | "decline") => {
    if (!result) return;
    try {
      await decisionMutation.mutateAsync({ spinResultId: result.spin._id, decision });
      toast.success(
        decision === "redeem"
          ? "Prize redeemed! Try-again count reset to 0."
          : "Continuing — try-again count kept, prize forfeited."
      );
    } catch {
      toast.error("Couldn't save your decision — please try again.");
      return;
    }
    closeResult();
  };

  const active = hasCredit && phase === "idle";

  return (
    <>
      <div
        data-testid="spin-machine"
        data-state={active ? "active" : "inactive"}
        className={`rounded-2xl border-2 p-6 text-center space-y-4 transition-colors duration-500 ${
          active
            ? "border-spin-active bg-spin-active/10"
            : "border-spin-inactive bg-spin-inactive/10"
        } ${justActivated ? "animate-pulse-glow" : ""}`}>
        <SpinWheel rotation={rotation}>
          <div
            className={`flex h-16 w-16 items-center justify-center rounded-full border-4 border-background transition-colors duration-500 ${
              active ? "bg-spin-active text-spin-active-foreground" : "bg-spin-inactive text-spin-inactive-foreground"
            }`}>
            {phase === "spinning" ? (
              <Loader2 className="h-7 w-7 animate-spin" />
            ) : active ? (
              <PartyPopper className="h-7 w-7" />
            ) : (
              <RotateCw className="h-7 w-7" />
            )}
          </div>
        </SpinWheel>

        <div>
          <h3 className="font-sora text-lg font-bold text-foreground">
            {active ? "Spin ready!" : "Spin machine"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {phase === "spinning"
              ? "Spinning..."
              : active
                ? "You earned a spin — go for it!"
                : "Finish a 5-ad cycle to unlock a spin."}
          </p>
        </div>

        <Button
          type="button"
          onClick={handleSpinClick}
          disabled={!active}
          data-testid="spin-button"
          className={
            active
              ? "w-full bg-spin-active text-spin-active-foreground hover:bg-spin-active/90"
              : "w-full bg-spin-inactive text-spin-inactive-foreground opacity-60 cursor-not-allowed"
          }>
          <Sparkles className="h-4 w-4 mr-2" />
          Spin
        </Button>
      </div>

      <Dialog open={!!result} onOpenChange={(open) => !open && closeResult()}>
        <DialogContent data-testid="spin-result-modal">
          <DialogHeader>
            <DialogTitle className="font-sora text-2xl">
              {result ? OUTCOME_COPY[result.spin.outcomeType].title : ""}
            </DialogTitle>
            <DialogDescription>
              {result ? OUTCOME_COPY[result.spin.outcomeType].description : ""}
            </DialogDescription>
          </DialogHeader>
          {result?.spin.outcomeType === "try_again" ? (
            <Button onClick={closeResult} className="w-full">
              Continue
            </Button>
          ) : (
            result && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground" data-testid="try-again-benchmark-copy">
                  You&apos;re at {result.tryAgainStatus.tryAgainCount} try-again
                  {result.tryAgainStatus.tryAgainCount !== 1 ? "s" : ""}.{" "}
                  {result.tryAgainStatus.distanceToNextBenchmarks["50"]} more unlocks the
                  20% guaranteed board, {result.tryAgainStatus.distanceToNextBenchmarks["100"]}{" "}
                  more unlocks the 50% guaranteed board.
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    disabled={decisionMutation.isPending}
                    onClick={() => handleDecision("decline")}>
                    Continue trying
                  </Button>
                  <Button
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={decisionMutation.isPending}
                    onClick={() => handleDecision("redeem")}>
                    {decisionMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Redeem current prize"
                    )}
                  </Button>
                </div>
              </div>
            )
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
