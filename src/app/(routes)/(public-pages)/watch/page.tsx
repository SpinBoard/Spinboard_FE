"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Tv } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { VideoPlayer } from "@/components/watch/video-player";
import { PerimeterStrip } from "@/components/billboard/perimeter-strip";
import { ApplyBox } from "@/components/billboard/apply-box";
import {
  useBillboardComplete,
  useBillboardHeartbeat,
  useBillboardQueue,
  useBillboardSession,
} from "@/hooks/use-billboard";
import { useStripFeed } from "@/hooks/use-freebies";
import { useAdminConfig } from "@/hooks/use-admin-config";
import { BillboardQueueSlot } from "@/types";

// The billboard plays continuously — no quiz, no "watch 5 to unlock,"
// nothing to gate on. Auth/profile completeness only matter when claiming a
// freebie code (handled inside ApplyBox), never for watching.
export default function WatchPage() {
  const { get } = useAdminConfig();
  const completionFraction = get("billboard.completionWatchFraction");
  const heartbeatToleranceMs = get("billboard.heartbeatToleranceMs");

  const sessionMutation = useBillboardSession();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [queue, setQueue] = useState<BillboardQueueSlot[]>([]);
  const [index, setIndex] = useState(0);

  const queueQuery = useBillboardQueue(sessionId);
  const heartbeat = useBillboardHeartbeat();
  const complete = useBillboardComplete();
  const stripFeed = useStripFeed();

  const completedForSlot = useRef<string | null>(null);
  const lastHeartbeatAt = useRef(0);

  useEffect(() => {
    sessionMutation.mutate(undefined, {
      onSuccess: (id) => setSessionId(id),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (queueQuery.data && queueQuery.data.length > 0) {
      setQueue((prev) => [...prev, ...queueQuery.data!]);
    }
  }, [queueQuery.data]);

  const current = queue[index];

  // Fetch a fresh batch once we're down to the last slot.
  useEffect(() => {
    if (!sessionId) return;
    if (queue.length > 0 && index >= queue.length - 1) {
      queueQuery.refetch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, sessionId]);

  const advance = () => {
    completedForSlot.current = null;
    lastHeartbeatAt.current = 0;
    setIndex((i) => i + 1);
  };

  const handleTimeUpdate = (watchedMs: number, durationMs: number) => {
    if (!sessionId || !current) return;

    if (watchedMs - lastHeartbeatAt.current >= heartbeatToleranceMs) {
      lastHeartbeatAt.current = watchedMs;
      heartbeat.mutate({ sessionId, slotId: current.slotId, watchedMs });
    }

    const target = durationMs > 0 ? durationMs : current.durationSec * 1000;
    if (
      completedForSlot.current !== current.slotId &&
      target > 0 &&
      watchedMs / target >= completionFraction
    ) {
      completedForSlot.current = current.slotId;
      complete.mutate({ sessionId, slotId: current.slotId, watchedMs });
    }
  };

  const handleEnded = () => {
    if (sessionId && current && completedForSlot.current !== current.slotId) {
      completedForSlot.current = current.slotId;
      complete.mutate({ sessionId, slotId: current.slotId, watchedMs: current.durationSec * 1000 });
    }
    advance();
  };

  return (
    <MainLayout maxWidth="4xl">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Tv className="h-7 w-7 text-primary" />
          <div>
            <h1 className="font-sora text-2xl sm:text-3xl font-bold text-foreground">
              The Billboard
            </h1>
            <p className="text-muted-foreground text-sm">
              Playing continuously — catch a freebie code on the strip and be first to type it.
            </p>
          </div>
        </div>

        {stripFeed.data && <PerimeterStrip items={stripFeed.data.items} />}

        {!current ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading the billboard...
          </div>
        ) : (
          <div className="space-y-3">
            <VideoPlayer
              key={current.slotId}
              src={current.videoUrl}
              onEnded={handleEnded}
              onTimeUpdate={handleTimeUpdate}
            />
            <p className="text-sm text-muted-foreground">
              {current.type === "AD" ? current.brandName : "Pazzell"} — {current.title}
            </p>
          </div>
        )}

        <div className="p-4 rounded-2xl border border-border bg-card/50 backdrop-blur-sm">
          <ApplyBox />
        </div>
      </div>
    </MainLayout>
  );
}
