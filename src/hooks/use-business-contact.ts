import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { api } from "@/lib/api";
import {
  BusinessContactThread,
  BusinessContactThreadCreateRequest,
  BusinessContactThreadResponse,
  BusinessContactThreadsResponse,
  BusinessContactMessage,
  BusinessContactMessagesResponse,
  BusinessContactMessageResponse,
} from "@/types";

const THREADS_KEY = ["business-contact-threads"];

// GET /business-contact/threads — every thread this brand is party to,
// either as the project's poster or as the quoter. posterBrandId/
// quoterBrandId on each thread tell the caller which side they're on.
export function useContactThreads() {
  const user = useAtomValue(userAtom);
  return useQuery<BusinessContactThread[]>({
    queryKey: THREADS_KEY,
    queryFn: () =>
      api.get<BusinessContactThreadsResponse>(ENDPOINTS.BUSINESS_CONTACT_THREADS).then((res) => res.data.threads),
    enabled: !!user?.accessToken && user.userType === "brand",
  });
}

// Idempotent — calling this again for the same (projectId, quotationId)
// just returns the existing thread rather than erroring. 403
// QUOTATION_NOT_VISIBLE if the caller can't see that quotation yet (poster
// hasn't unlocked it, or this isn't the poster/quoter of it at all).
export function useCreateContactThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: BusinessContactThreadCreateRequest) =>
      api
        .post<BusinessContactThreadResponse>(ENDPOINTS.BUSINESS_CONTACT_THREADS, payload)
        .then((res) => res.data.thread),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: THREADS_KEY }),
  });
}

export function useThreadMessages(threadId: string | null) {
  const user = useAtomValue(userAtom);
  return useQuery<BusinessContactMessage[]>({
    queryKey: ["business-contact-messages", threadId],
    queryFn: () =>
      api
        .get<BusinessContactMessagesResponse>(ENDPOINTS.BUSINESS_CONTACT_THREAD_MESSAGES(threadId!))
        .then((res) => res.data.messages),
    enabled: !!user?.accessToken && !!threadId,
  });
}

export function useSendThreadMessage(threadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      api
        .post<BusinessContactMessageResponse>(ENDPOINTS.BUSINESS_CONTACT_THREAD_MESSAGES(threadId), { body })
        .then((res) => res.data.message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-contact-messages", threadId] });
      queryClient.invalidateQueries({ queryKey: THREADS_KEY });
    },
  });
}
