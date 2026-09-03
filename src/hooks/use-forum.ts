import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAtomValue } from "jotai";
import { userAtom } from "@/atom/user";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { api } from "@/lib/api";
import {
  ForumThread,
  ForumThreadCreateRequest,
  ForumThreadResponse,
  ForumThreadsResponse,
  ForumPost,
  ForumPostCreateRequest,
  ForumPostResponse,
  ForumPostsResponse,
  ForumPostLikeResponse,
  ForumPostUnlikeResponse,
  ForumFlag,
  AdminForumFlagsResponse,
  AdminForumFlagResolveRequest,
  WinnerShareSubmission,
  WinnerShareSubmitRequest,
  WinnerShareSubmissionResponse,
  WinnerShareSubmissionsResponse,
  AdminWinnerShareReviewRequest,
} from "@/types";

const THREADS_KEY = ["forum-threads"];

// Public — no auth required.
export function useForumThreads() {
  return useQuery<ForumThread[]>({
    queryKey: THREADS_KEY,
    queryFn: () => api.get<ForumThreadsResponse>(ENDPOINTS.FORUM_THREADS).then((res) => res.data.threads),
  });
}

export function useCreateForumThread() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ForumThreadCreateRequest) =>
      api.post<ForumThreadResponse>(ENDPOINTS.FORUM_THREADS, payload).then((res) => res.data.thread),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: THREADS_KEY }),
  });
}

export function useForumThreadPosts(threadId: string | null) {
  return useQuery<ForumPost[]>({
    queryKey: ["forum-posts", threadId],
    queryFn: () =>
      api.get<ForumPostsResponse>(ENDPOINTS.FORUM_THREAD_POSTS(threadId!)).then((res) => res.data.posts),
    enabled: !!threadId,
  });
}

export function useCreateForumPost(threadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ForumPostCreateRequest) =>
      api.post<ForumPostResponse>(ENDPOINTS.FORUM_THREAD_POSTS(threadId), payload).then((res) => res.data.post),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum-posts", threadId] }),
  });
}

// Two separate explicit calls, not a toggle — see ForumPostLikeResponse's
// comment in types/index.ts. Both invalidate the thread's posts so
// likeCount refreshes from the server rather than trusting a local guess.
export function useLikeForumPost(threadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) =>
      api.post<ForumPostLikeResponse>(ENDPOINTS.FORUM_POST_LIKE(postId)).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum-posts", threadId] }),
  });
}

export function useUnlikeForumPost(threadId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) =>
      api.delete<ForumPostUnlikeResponse>(ENDPOINTS.FORUM_POST_LIKE(postId)).then((res) => res.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["forum-posts", threadId] }),
  });
}

// No per-user dedup server-side — don't disable the report button after
// one use.
export function useFlagForumPost() {
  return useMutation({
    mutationFn: ({ postId, reason }: { postId: string; reason: string }) =>
      api.post(ENDPOINTS.FORUM_POST_FLAG(postId), { reason }),
  });
}

// ── Admin: moderation flags ──

export function useAdminForumFlags(status: string = "open") {
  const user = useAtomValue(userAtom);
  return useQuery<ForumFlag[]>({
    queryKey: ["admin-forum-flags", status],
    queryFn: () =>
      api.get<AdminForumFlagsResponse>(ENDPOINTS.ADMIN_FORUM_FLAGS(status)).then((res) => res.data.flags),
    enabled: !!user?.accessToken && user.userType === "admin",
  });
}

export function useResolveForumFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ flagId, ...payload }: { flagId: string } & AdminForumFlagResolveRequest) =>
      api.patch(ENDPOINTS.ADMIN_FORUM_FLAG_RESOLVE(flagId), payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-forum-flags"] }),
  });
}

// ── Winner-share submissions (self-reported, for a bonus-points review) ──

export function useMyWinnerSubmissions() {
  const user = useAtomValue(userAtom);
  return useQuery<WinnerShareSubmission[]>({
    queryKey: ["winner-submissions-mine"],
    queryFn: () =>
      api
        .get<WinnerShareSubmissionsResponse>(ENDPOINTS.FORUM_WINNER_SUBMISSIONS_MINE)
        .then((res) => res.data.submissions),
    enabled: !!user?.accessToken,
  });
}

export function useSubmitWinnerShare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: WinnerShareSubmitRequest) =>
      api
        .post<WinnerShareSubmissionResponse>(ENDPOINTS.FORUM_WINNER_SUBMISSIONS, payload)
        .then((res) => res.data.submission),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["winner-submissions-mine"] }),
  });
}

// ── Admin: winner-share review queue ──

export function useAdminWinnerSubmissions(status: string = "submitted") {
  const user = useAtomValue(userAtom);
  return useQuery<WinnerShareSubmission[]>({
    queryKey: ["admin-winner-submissions", status],
    queryFn: () =>
      api
        .get<WinnerShareSubmissionsResponse>(ENDPOINTS.ADMIN_FORUM_WINNER_SUBMISSIONS(status))
        .then((res) => res.data.submissions),
    enabled: !!user?.accessToken && user.userType === "admin",
  });
}

function invalidateAdminSubmissions(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["admin-winner-submissions"] });
}

export function useVerifyWinnerSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & AdminWinnerShareReviewRequest) =>
      api.post(ENDPOINTS.ADMIN_FORUM_WINNER_SUBMISSION_VERIFY(id), payload),
    onSuccess: () => invalidateAdminSubmissions(queryClient),
  });
}

export function useRejectWinnerSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & AdminWinnerShareReviewRequest) =>
      api.post(ENDPOINTS.ADMIN_FORUM_WINNER_SUBMISSION_REJECT(id), payload),
    onSuccess: () => invalidateAdminSubmissions(queryClient),
  });
}
