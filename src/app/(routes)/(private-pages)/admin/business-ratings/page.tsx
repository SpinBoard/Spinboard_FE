"use client";

import { useState } from "react";
import { toast } from "sonner";
import { EyeOff, Loader2, Star } from "lucide-react";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Pill } from "@/components/ui/freebiz-pill";
import { Button } from "@/components/ui/freebiz-button";
import { Field } from "@/components/ui/freebiz-field";
import { Textarea } from "@/components/ui/freebiz-input";
import { PageLoader } from "@/components/ui/page-loader";
import { useAdminRatingFlags, useHideRating } from "@/hooks/use-business-ratings";
import { apiErrorMessage } from "@/app/_utils/helper";

// New 2026-09-02 — reactive moderation for reported business ratings, same
// report -> auto-flag -> admin-decides posture as ad-campaign moderation.
// Hiding a rating never deletes it (BusinessRating.hidden flips instead).
export default function AdminBusinessRatingsPage() {
  const { data: flagged, isLoading, error } = useAdminRatingFlags();
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const hideRating = useHideRating();

  if (isLoading) return <PageLoader withLayout={false} message="Loading reported ratings..." />;
  if (error) return <Card><CardNote>Failed to load reported ratings. Please try again.</CardNote></Card>;

  const handleHide = (id: string) => {
    const reason = (reasons[id] ?? "").trim();
    if (!reason) {
      toast.error("A reason is required to hide a rating.");
      return;
    }
    hideRating.mutate(
      { ratingId: id, reason },
      {
        onSuccess: () => toast.success("Hidden."),
        onError: (err) => toast.error(apiErrorMessage(err, "Couldn't hide this rating.")),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p style={{ fontFamily: "var(--mono)", fontSize: 10.5, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--faint)" }}>
            Admin / Ratings moderation
          </p>
          <h1 className="mt-1" style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
            Reported ratings
          </h1>
          <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
            A rating stays visible until you hide it — reporting alone never removes it automatically.
          </p>
        </div>
        <Pill tone={flagged && flagged.length > 0 ? "bad" : "default"} dot>{flagged?.length ?? 0} flagged</Pill>
      </div>

      {!flagged || flagged.length === 0 ? (
        <Card><CardNote>Nothing flagged right now.</CardNote></Card>
      ) : (
        <div className="space-y-3">
          {flagged.map((rating) => (
            <Card key={rating._id}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5" style={{ color: i < rating.score ? "var(--free)" : "var(--faint)", fill: i < rating.score ? "var(--free)" : "none" }} />
                  ))}
                </div>
                <span className="fb-hint">{new Date(rating.createdAt).toLocaleDateString()}</span>
              </div>
              {rating.comment && <p className="mt-2" style={{ fontSize: 13.5, color: "var(--txt)" }}>{rating.comment}</p>}
              <p className="fb-hint mt-1">Rated by {rating.raterBrandId} · about {rating.ratedBrandId} · project {rating.projectId.slice(-6)}</p>

              <div className="mt-3 pt-3 flex flex-wrap items-end gap-2" style={{ borderTop: "1px solid var(--line)" }}>
                <Field label="Reason to hide" className="flex-1 min-w-[220px]">
                  <Textarea
                    rows={1}
                    value={reasons[rating._id] ?? ""}
                    onChange={(e) => setReasons((prev) => ({ ...prev, [rating._id]: e.target.value }))}
                    placeholder="e.g. Fabricated / abusive content"
                  />
                </Field>
                <Button variant="danger" disabled={hideRating.isPending} onClick={() => handleHide(rating._id)}>
                  {hideRating.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
                  Hide
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
