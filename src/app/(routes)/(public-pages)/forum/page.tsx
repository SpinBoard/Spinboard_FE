"use client";

import { useState } from "react";
import { useAtomValue } from "jotai";
import Link from "next/link";
import { toast } from "sonner";
import { MessagesSquare, Pin, Lock, Plus, Loader2 } from "lucide-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Button } from "@/components/ui/freebiz-button";
import { Pill } from "@/components/ui/freebiz-pill";
import { Field } from "@/components/ui/freebiz-field";
import { Input } from "@/components/ui/freebiz-input";
import { PageLoader } from "@/components/ui/page-loader";
import { userAtom } from "@/atom/user";
import { routes } from "@/app/_utils/routes";
import { apiErrorMessage } from "@/app/_utils/helper";
import { useForumThreads, useCreateForumThread } from "@/hooks/use-forum";

// New 2026-09-02 — public discussion forum. Browsing is fully public
// (GET /forum/threads has no auth requirement); posting a new thread
// requires login, gated inline the same way the Promote & Earn public
// pages handle it rather than a hard redirect.
export default function ForumPage() {
  const user = useAtomValue(userAtom);
  const { data: threads, isLoading, error } = useForumThreads();
  const createThread = useCreateForumThread();

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");

  const sorted = threads
    ? [...threads].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      })
    : [];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("A title is required.");
      return;
    }
    createThread.mutate(
      { title: title.trim(), category: category.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Thread created.");
          setTitle("");
          setCategory("");
          setShowForm(false);
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't create this thread.")),
      }
    );
  };

  if (isLoading) return <PageLoader message="Loading the forum..." />;

  return (
    <MainLayout maxWidth="3xl">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
            Forum
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
            Talk to other viewers about the billboard, freebies, and Promote &amp; Earn.
          </p>
        </div>
        {user ? (
          <Button variant="primary" onClick={() => setShowForm((s) => !s)}>
            <Plus className="h-4 w-4" /> New thread
          </Button>
        ) : (
          <Link href={`${routes.LOGIN}?returnTo=${encodeURIComponent(routes.FORUM)}`}>
            <Button variant="primary">Log in to post</Button>
          </Link>
        )}
      </div>

      {showForm && (
        <Card className="mb-4">
          <form onSubmit={handleCreate} className="space-y-3">
            <Field label="Title" htmlFor="title">
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's on your mind?" required />
            </Field>
            <Field label="Category (optional)" htmlFor="category">
              <Input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Freebies" />
            </Field>
            <Button type="submit" variant="primary" disabled={createThread.isPending}>
              {createThread.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post thread"}
            </Button>
          </form>
        </Card>
      )}

      {error ? (
        <Card><CardNote>Failed to load the forum. Please try again.</CardNote></Card>
      ) : sorted.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <MessagesSquare className="h-8 w-8 mx-auto mb-3" style={{ color: "var(--faint)" }} />
            <CardNote>No threads yet — start the first one.</CardNote>
          </div>
        </Card>
      ) : (
        <div className="space-y-2">
          {sorted.map((thread) => (
            <Link key={thread._id} href={routes.FORUM_THREAD(thread._id)}>
              <Card tight className="p-3.5 transition-colors hover:border-[var(--accent)]">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {thread.pinned && <Pin className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--free)" }} />}
                    {thread.locked && <Lock className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--faint)" }} />}
                    <b style={{ fontSize: 14, color: "var(--txt)" }} className="truncate">{thread.title}</b>
                  </div>
                  {thread.category && <Pill><span style={{ textTransform: "capitalize" }}>{thread.category}</span></Pill>}
                </div>
                <p className="fb-hint mt-1">{new Date(thread.createdAt).toLocaleDateString()}</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
