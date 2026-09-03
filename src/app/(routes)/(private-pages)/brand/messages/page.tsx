"use client";

import { useState } from "react";
import { useAtomValue } from "jotai";
import { toast } from "sonner";
import { Send, Loader2, Star, MessageSquare } from "lucide-react";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Button } from "@/components/ui/freebiz-button";
import { Field } from "@/components/ui/freebiz-field";
import { Input, Textarea } from "@/components/ui/freebiz-input";
import { PageLoader } from "@/components/ui/page-loader";
import { userAtom } from "@/atom/user";
import { apiErrorMessage } from "@/app/_utils/helper";
import { useContactThreads, useThreadMessages, useSendThreadMessage } from "@/hooks/use-business-contact";
import { useCreateRating } from "@/hooks/use-business-ratings";

// New 2026-09-02 — private contact threads opened once a quotation is
// visible to its project's poster (see project detail page's "Contact"
// action). Either side of a thread can rate the other afterward — "Rate"
// only makes sense from inside an existing thread (CONTACT_REQUIRED fires
// otherwise), so it lives here, not on a standalone screen.
export default function BrandMessagesPage() {
  const user = useAtomValue(userAtom);
  const { data: threads, isLoading, error } = useContactThreads();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageBody, setMessageBody] = useState("");
  const [showRateForm, setShowRateForm] = useState(false);
  const [score, setScore] = useState(5);
  const [comment, setComment] = useState("");

  const selected = (threads ?? []).find((t) => t._id === selectedId) ?? (threads ?? [])[0] ?? null;
  const { data: messages, isLoading: loadingMessages } = useThreadMessages(selected?._id ?? null);
  const sendMessage = useSendThreadMessage(selected?._id ?? "");
  const createRating = useCreateRating();

  if (isLoading) return <PageLoader withLayout={false} message="Loading messages..." />;
  if (error) return <Card><CardNote>Failed to load messages. Please try again.</CardNote></Card>;

  const otherBrandId = (thread: typeof selected) =>
    !thread ? null : thread.posterBrandId === user?.id ? thread.quoterBrandId : thread.posterBrandId;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageBody.trim() || !selected) return;
    sendMessage.mutate(messageBody.trim(), {
      onSuccess: () => setMessageBody(""),
      onError: (err) => toast.error(apiErrorMessage(err, "Couldn't send that message.")),
    });
  };

  const handleRate = () => {
    if (!selected) return;
    const ratedBrandId = otherBrandId(selected);
    if (!ratedBrandId) return;
    createRating.mutate(
      { projectId: selected.projectId, quotationId: selected.quotationId, ratedBrandId, score, comment: comment.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Rating submitted.");
          setShowRateForm(false);
          setComment("");
        },
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't submit your rating — you may have already rated this business on this project.")),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <p style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)" }}>
          Brands / Messages
        </p>
        <h1 className="mt-1" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
          Messages
        </h1>
      </div>

      {!threads || threads.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-3" style={{ color: "var(--faint)" }} />
            <CardNote>No contact threads yet — open one from a project&apos;s quotations.</CardNote>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">
          <Card tight className="lg:max-h-[640px] lg:overflow-y-auto">
            {threads.map((t) => (
              <div
                key={t._id}
                className="px-3 py-2.5 cursor-pointer"
                style={{ borderTop: "1px solid var(--line)", background: selected?._id === t._id ? "var(--accent-soft)" : undefined }}
                onClick={() => { setSelectedId(t._id); setShowRateForm(false); }}>
                <b style={{ fontSize: 13, color: "var(--txt)" }} className="block truncate">
                  {t.posterBrandId === user?.id ? "Quoter" : "Poster"} · project {t.projectId.slice(-6)}
                </b>
                <span className="fb-hint">
                  {t.lastMessageAt ? new Date(t.lastMessageAt).toLocaleString() : new Date(t.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </Card>

          {selected && (
            <Card className="flex flex-col" style={{ minHeight: 420 }}>
              <div className="flex items-center justify-between gap-2 pb-3" style={{ borderBottom: "1px solid var(--line)" }}>
                <span className="fb-hint">Project {selected.projectId.slice(-6)} · Quotation {selected.quotationId.slice(-6)}</span>
                <Button size="sm" variant="ghost" onClick={() => setShowRateForm((s) => !s)}>
                  <Star className="h-3.5 w-3.5" /> Rate
                </Button>
              </div>

              {showRateForm && (
                <div className="my-3 p-3 rounded-lg space-y-2" style={{ background: "var(--ink-900)", border: "1px solid var(--line)" }}>
                  <Field label="Score">
                    <select className="fb-input" value={score} onChange={(e) => setScore(Number(e.target.value))}>
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n !== 1 ? "s" : ""}</option>)}
                    </select>
                  </Field>
                  <Field label="Comment (optional)">
                    <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
                  </Field>
                  <Button variant="primary" size="sm" disabled={createRating.isPending} onClick={handleRate}>
                    {createRating.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Submit rating"}
                  </Button>
                </div>
              )}

              <div className="flex-1 overflow-y-auto space-y-2 py-2">
                {loadingMessages ? (
                  <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--muted)" }} />
                ) : !messages || messages.length === 0 ? (
                  <CardNote>No messages yet — say hello.</CardNote>
                ) : (
                  messages.map((m) => {
                    const isMine = m.senderBrandId === user?.id;
                    return (
                      <div key={m._id} className="flex" style={{ justifyContent: isMine ? "flex-end" : "flex-start" }}>
                        <div
                          className="max-w-[75%] px-3 py-2 rounded-lg"
                          style={{ background: isMine ? "var(--accent-soft)" : "var(--ink-900)", border: "1px solid var(--line)" }}>
                          <p style={{ fontSize: 13, color: "var(--txt)" }}>{m.body}</p>
                          <p className="fb-hint mt-0.5">{new Date(m.createdAt).toLocaleTimeString()}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form onSubmit={handleSend} className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid var(--line)" }}>
                <Input placeholder="Type a message..." value={messageBody} onChange={(e) => setMessageBody(e.target.value)} className="flex-1" />
                <Button type="submit" variant="primary" disabled={sendMessage.isPending || !messageBody.trim()}>
                  {sendMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
