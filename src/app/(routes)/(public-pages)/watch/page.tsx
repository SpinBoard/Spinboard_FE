"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/watch/video-player";
import { QuizPanel } from "@/components/watch/quiz-panel";
import { SpinMachine } from "@/components/spin/spin-machine";
import { useAdNext, useAdQuizSubmit, useAdVideoComplete, useAdVideoStart } from "@/hooks/use-ads";
import { useSpinCredit } from "@/hooks/use-spin";
import { useAdminConfig } from "@/hooks/use-admin-config";

export default function WatchPage() {
  const { data, isLoading, isError, refetch, isFetching } = useAdNext();
  const videoStartMutation = useAdVideoStart();
  const videoCompleteMutation = useAdVideoComplete();
  const quizSubmitMutation = useAdQuizSubmit();
  const { setHasCredit } = useSpinCredit();
  const { get } = useAdminConfig();
  const adsPerCycle = get("spin.adsPerCycle");

  const [quizResult, setQuizResult] = useState<{ allCorrect: boolean } | null>(null);
  const [passed, setPassed] = useState(false);
  const startedForCampaignId = useRef<string | null>(null);

  const ad = data?.ad;

  useEffect(() => {
    setQuizResult(null);
    setPassed(false);
  }, [ad?.campaignId]);

  useEffect(() => {
    if (ad?.campaignId && startedForCampaignId.current !== ad.campaignId) {
      startedForCampaignId.current = ad.campaignId;
      videoStartMutation.mutate(ad.campaignId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad?.campaignId]);

  const handleVideoEnded = () => {
    if (ad?.campaignId) videoCompleteMutation.mutate(ad.campaignId);
  };

  const handleQuizSubmit = async (answers: number[]) => {
    if (!ad?.campaignId) return;
    try {
      const result = await quizSubmitMutation.mutateAsync({
        campaignId: ad.campaignId,
        answers,
      });
      setQuizResult({ allCorrect: result.allCorrect });
      if (result.allCorrect) {
        setPassed(true);
        if (result.cycleCompleted) setHasCredit(true);
      }
    } catch {
      setQuizResult({ allCorrect: false });
    }
  };

  const handleNext = () => refetch();

  const position = data ? Math.min(data.adsWatchedSoFar + 1, adsPerCycle) : 1;

  return (
    <MainLayout maxWidth="7xl">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-sora text-2xl sm:text-3xl font-bold text-foreground">
              Watch &amp; earn
            </h1>
            <p className="text-muted-foreground text-sm" data-testid="cycle-progress">
              Ad {position} of {adsPerCycle}
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading next ad...
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <p className="text-foreground">Couldn&apos;t load an ad right now.</p>
            <Button onClick={() => refetch()} variant="outline">
              Try again
            </Button>
          </div>
        )}

        {ad && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="space-y-4 lg:sticky lg:top-28">
              <div>
                <h2 className="font-sora text-xl font-bold text-foreground">
                  {ad.title}
                </h2>
                <p className="text-sm text-muted-foreground">{ad.description}</p>
              </div>
              <VideoPlayer src={ad.videoUrl} onEnded={handleVideoEnded} />
              <SpinMachine />
            </div>

            <div className="space-y-4">
              {passed ? (
                <div className="p-6 rounded-2xl border border-success bg-success/10 text-center space-y-4">
                  <p className="font-sora text-lg font-bold text-foreground">
                    All correct!
                  </p>
                  <Button
                    onClick={handleNext}
                    disabled={isFetching}
                    data-testid="next-ad-button"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground">
                    {isFetching ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4 mr-2" />
                    )}
                    Next ad
                  </Button>
                </div>
              ) : (
                <QuizPanel
                  questions={ad.questions}
                  onSubmit={handleQuizSubmit}
                  submitting={quizSubmitMutation.isPending}
                  lastResult={quizResult}
                  campaignKey={ad.campaignId}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
