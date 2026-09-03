"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAtomValue } from "jotai";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Heart, Flag, Lock, Pin, Loader2, EyeOff } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Button } from "@/components/ui/freebiz-button";
import { Pill } from "@/components/ui/freebiz-pill";
import { Avatar } from "@/components/ui/freebiz-avatar";
import { Textarea } from "@/components/ui/freebiz-input";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { userAtom } from "@/atom/user";
import { routes } from "@/app/_utils/routes";
import { apiErrorMessage } from "@/app/_utils/helper";
import {
  useForumThreads,
  useForumThreadPosts,
  useCreateForumPost,
  useLikeForumPost,
  useUnlikeForumPost,
  useFlagForumPost,
} from "@/hooks/use-forum";

// New 2026-09-02. Like/unlike are two separate endpoints, not a toggle, and
// nothing tells the caller whether the current user already liked a given
// post — so `likedByMe` here is a client-only, this-session-only guess
// (starts unliked always), not restored on reload. Flag has no per-user
// dedup server-side, so the Report action stays available after use.
// "hidden" posts aren't excluded server-side (only "removed" is) — this
// page renders a placeholder for them client-side instead of the real body,
// per BUSINESS_RULES.md/UI_CONTRACT.md's explicit instruction to do so.
export default function ForumThreadPage() {
  const params = useParams();
  const threadId = params.threadId as string;
  const user = useAtomValue(userAtom);

  // No GET /forum/threads/:id detail endpoint is documented — the thread's
  // own title/pinned/locked come from the list endpoint instead.
  const { data: threads, isLoading: loadingThreads } = useForumThreads();
  const thread = threads?.find((t) => t._id === threadId) ?? null;

  const { data: posts, isLoading: loadingPosts, error } = useForumThreadPosts(threadId);
  const createPost = useCreateForumPost(threadId);
  const likePost = useLikeForumPost(threadId);
  const unlikePost = useUnlikeForumPost(threadId);
  const flagPost = useFlagForumPost();

  const [body, setBody] = useState("");
  const [likedByMe, setLikedByMe] = useState<Set<string>>(new Set());
  const [flaggingId, setFlaggingId] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState("");

  const toggleLike = (postId: string) => {
    if (likedByMe.has(postId)) {
      unlikePost.mutate(postId, {
        onSuccess: () => setLikedByMe((prev) => { const next = new Set(prev); next.delete(postId); return next; }),
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't unlike this post.")),
      });
    } else {
      likePost.mutate(postId, {
        onSuccess: () => setLikedByMe((prev) => new Set(prev).add(postId)),
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't like this post.")),
      });
    }
  };

  const handleFlag = (postId: string) => {
    if (!flagReason.trim()) {
      toast.error("A reason is required to report a post.");
      return;
    }
    flagPost.mutate(
      { postId, reason: flagReason.trim() },
      {
        onSuccess: () => {
          toast.success("Reported — a moderator will take a look.");
          setFlaggingId(null);
          setFlagReason("");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't report this post.")),
      }
    );
  };

  const handleSubmitPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    createPost.mutate(
      { body: body.trim() },
      {
        onSuccess: () => setBody(""),
        onError: (err) => {
          if (err && typeof err === "object" && "response" in err) {
            const status = (err as { response?: { status?: number } }).response?.status;
            if (status === 400) {
              toast.error("This thread is locked — no new replies.");
              return;
            }
          }
          toast.error(apiErrorMessage(err, "Couldn't post your reply."));
        },
      }
    );
  };

  if (loadingThreads || loadingPosts) return <PageLoader message="Loading thread..." />;
  if (error) {
    return <PageError title="Thread Not Found" message="This thread could not be found." showRetry={false} />;
  }

  return (
    <MainLayout maxWidth="3xl">
      <Link href={routes.FORUM}>
        <Button variant="ghost" className="mb-4"><ArrowLeft className="h-4 w-4" /> Back to forum</Button>
      </Link>

      <Card className="mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {thread?.pinned && <Pin className="h-4 w-4" style={{ color: "var(--free)" }} />}
          {thread?.locked && <Lock className="h-4 w-4" style={{ color: "var(--faint)" }} />}
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 20, color: "var(--txt)" }}>
            {thread?.title ?? "Thread"}
          </h1>
        </div>
        {thread?.category && <Pill className="mt-2"><span style={{ textTransform: "capitalize" }}>{thread.category}</span></Pill>}
      </Card>

      <div className="space-y-3">
        {!posts || posts.length === 0 ? (
          <Card><CardNote>No replies yet.</CardNote></Card>
        ) : (
          posts
            .filter((p) => p.moderationStatus !== "removed")
            .map((post) => (
              <Card key={post._id} tight className="p-3.5">
                <div className="flex items-start gap-2.5">
                  <Avatar initials={post.userId.slice(0, 2).toUpperCase()} />
                  <div className="flex-1 min-w-0">
                    <p className="fb-hint">{new Date(post.createdAt).toLocaleString()}</p>
                    {post.moderationStatus === "hidden" ? (
                      <p className="mt-1 flex items-center gap-1.5 italic" style={{ fontSize: 13, color: "var(--faint)" }}>
                        <EyeOff className="h-3.5 w-3.5" /> This post was hidden by a moderator.
                      </p>
                    ) : (
                      <p className="mt-1" style={{ fontSize: 13.5, color: "var(--txt)", whiteSpace: "pre-wrap" }}>{post.body}</p>
                    )}

                    <div className="flex items-center gap-3 mt-2">
                      <button
                        type="button"
                        disabled={!user || likePost.isPending || unlikePost.isPending}
                        onClick={() => toggleLike(post._id)}
                        className="flex items-center gap-1"
                        style={{ fontSize: 12.5, color: likedByMe.has(post._id) ? "var(--free)" : "var(--muted)" }}>
                        <Heart className="h-3.5 w-3.5" style={likedByMe.has(post._id) ? { fill: "var(--free)" } : undefined} />
                        {post.likeCount}
                      </button>
                      {user && (
                        <button
                          type="button"
                          onClick={() => setFlaggingId(flaggingId === post._id ? null : post._id)}
                          className="flex items-center gap-1"
                          style={{ fontSize: 12.5, color: "var(--muted)" }}>
                          <Flag className="h-3.5 w-3.5" /> Report
                        </button>
                      )}
                    </div>

                    {flaggingId === post._id && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          className="fb-input"
                          style={{ fontSize: 12.5, height: 30 }}
                          placeholder="Reason"
                          value={flagReason}
                          onChange={(e) => setFlagReason(e.target.value)}
                        />
                        <Button size="sm" variant="danger" disabled={flagPost.isPending} onClick={() => handleFlag(post._id)}>
                          {flagPost.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Submit"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))
        )}
      </div>

      <Card className="mt-4">
        {!user ? (
          <p style={{ fontSize: 13.5, color: "var(--muted)" }}>
            <Link href={`${routes.LOGIN}?returnTo=${encodeURIComponent(routes.FORUM_THREAD(threadId))}`} style={{ color: "var(--accent)" }}>
              Log in
            </Link>{" "}
            to reply.
          </p>
        ) : thread?.locked ? (
          <CardNote>This thread is locked — no new replies.</CardNote>
        ) : (
          <form onSubmit={handleSubmitPost} className="space-y-2.5">
            <Textarea rows={3} placeholder="Write a reply..." value={body} onChange={(e) => setBody(e.target.value)} />
            <Button type="submit" variant="primary" disabled={createPost.isPending || !body.trim()}>
              {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reply"}
            </Button>
          </form>
        )}
      </Card>
    </MainLayout>
  );
}
