"use client";

import { useAtom } from "jotai";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { spinCreditAtom } from "@/atom/spin-credit";
import {
  SpinResponse,
  SpinWinDecisionRequest,
  TryAgainBenchmark,
  TryAgainStatusResponse,
} from "@/types";

// The API contract has no "do I have an unspent spin credit" GET endpoint —
// POST /spins either consumes one or hard-rejects (§5). The only signal the
// client ever gets that a credit exists is `cycleCompleted` on the quiz-
// submit response (§3). We track that in spinCreditAtom (localStorage-backed,
// shared across the watch page and the persistent SpinMachine widget) and
// clear it once a spin is actually resolved — mirroring the product spec:
// the spin machine is yellow until a cycle completes, green until spun,
// then yellow again.
export function useSpinCredit() {
  const [hasCredit, setHasCredit] = useAtom(spinCreditAtom);
  return { hasCredit, setHasCredit };
}

export function useSpin() {
  return useMutation({
    mutationFn: () => api.post<SpinResponse>(ENDPOINTS.SPINS).then((res) => res.data),
  });
}

export function useSpinWinDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      spinResultId,
      decision,
    }: {
      spinResultId: string;
    } & SpinWinDecisionRequest) =>
      api.post(ENDPOINTS.SPIN_WIN_DECISION(spinResultId), { decision }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["try-again-status"] });
    },
  });
}

export function useTryAgainStatus(enabled: boolean) {
  return useQuery({
    queryKey: ["try-again-status"],
    queryFn: () =>
      api.get<TryAgainStatusResponse>(ENDPOINTS.TRY_AGAIN_STATUS).then((res) => res.data),
    enabled,
    retry: false,
  });
}

export function useTryAgainSpend() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (benchmark: TryAgainBenchmark) =>
      api
        .post<SpinResponse>(ENDPOINTS.TRY_AGAIN_SPEND, { benchmark })
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["try-again-status"] });
    },
  });
}
