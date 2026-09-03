"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Image as ImageIcon, Loader2, Upload, Video as VideoIcon, X } from "lucide-react";
import { Card, CardNote } from "@/components/ui/freebiz-card";
import { Field } from "@/components/ui/freebiz-field";
import { Input, Textarea } from "@/components/ui/freebiz-input";
import { Button } from "@/components/ui/freebiz-button";
import { Pill } from "@/components/ui/freebiz-pill";
import { PageLoader } from "@/components/ui/page-loader";
import { PageError } from "@/components/ui/page-error";
import { usePromoteCampaignsMine, useCreatePromoteCampaign } from "@/hooks/use-promote";
import { useAdminConfig } from "@/hooks/use-admin-config";
import { apiErrorCode, apiErrorMessage } from "@/app/_utils/helper";
import { getVideoDuration, validateVideoFile } from "../campaigns/create/wizard-utils";

type MediaKind = "image" | "video";

// design/freebiz-mockup.html data-screen="b-contest" — visual reference
// only. The mockup's "Prize pot and the clock" step (a brand-funded pot,
// duration, winner count) doesn't exist here — Promote & Earn campaigns are
// free to post; the grand prize is admin-funded per platform-wide period,
// not per campaign (docs/FRONTEND_IMPLEMENTATION_GUIDE.md §2 Revamp 5). So
// this is a plain post-a-campaign form (media + title + description) plus
// the brand's own campaign list with all-time likeCount, not a wizard.
// There's no brand-facing pause/resume for a Promote campaign — unlike ad
// campaigns, POST /promote/campaigns/deactivate|reactivate is admin-only
// (§5 API reference) — so the list below is read-only status, not an
// action row.
export default function BrandPromotePage() {
  const { get } = useAdminConfig();
  const { data: campaigns, error, isLoading } = usePromoteCampaignsMine(true);
  const createCampaign = useCreatePromoteCampaign();

  const [mediaKind, setMediaKind] = useState<MediaKind>("image");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileError, setFileError] = useState("");
  const [checkingFile, setCheckingFile] = useState(false);

  const resetForm = () => {
    setFile(null);
    setPreviewUrl("");
    setTitle("");
    setDescription("");
    setFileError("");
  };

  const handleFileChange = async (selected: File) => {
    setFileError("");
    setFile(null);
    setCheckingFile(true);
    try {
      if (mediaKind === "video") {
        const duration = await getVideoDuration(selected);
        const result = validateVideoFile(selected, duration, {
          maxDurationSeconds: get("video.maxDurationSeconds"),
          maxSizeBytes: get("video.maxSizeBytes"),
        });
        if (!result.valid) {
          setFileError(result.message ?? "Invalid video file.");
          return;
        }
      } else if (!selected.type.startsWith("image/")) {
        setFileError("Please upload an image file.");
        return;
      }
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    } catch (err) {
      setFileError(err instanceof Error ? err.message : "Could not read this file.");
    } finally {
      setCheckingFile(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim() || !description.trim()) {
      toast.error("A media file, title, and description are all required.");
      return;
    }
    const formData = new FormData();
    formData.append("media", file);
    formData.append("title", title.trim());
    formData.append("description", description.trim());
    createCampaign.mutate(formData, {
      onSuccess: () => {
        toast.success("Campaign posted — it's live immediately, free to post.");
        resetForm();
      },
      onError: (err) => {
        if (apiErrorCode(err) === "BRAND_SUSPENDED") {
          toast.error("Your account is suspended — contact support before posting a new campaign.");
          return;
        }
        toast.error(apiErrorMessage(err, "Failed to post campaign."));
      },
    });
  };

  if (isLoading) return <PageLoader withLayout={false} message="Loading Promote & Earn..." />;
  if (error) {
    return (
      <PageError withLayout={false}
        title="Failed to Load"
        message="Unable to load your Promote & Earn campaigns. Please try again."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p
          style={{
            fontFamily: "var(--mono)",
            fontSize: 10.5,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--faint)",
          }}>
          Brands / Promote &amp; earn
        </p>
        <h1
          className="mt-1"
          style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
          Let viewers carry your campaign
        </h1>
        <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
          Post an image or a video, free — no payment, no moderation queue. Viewers grab a personal
          link and compete for the platform&apos;s cumulative-likes prize; you don&apos;t fund anything here.
        </p>
      </div>

      <Card>
        <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Post a campaign</h3>
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <div className="flex rounded-xl p-1" style={{ background: "var(--ink-900)" }}>
            <button
              type="button"
              onClick={() => {
                setMediaKind("image");
                setFile(null);
                setPreviewUrl("");
                setFileError("");
              }}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all"
              style={mediaKind === "image" ? { background: "var(--free)", color: "var(--ink-900)" } : { color: "var(--muted)" }}>
              <ImageIcon className="h-4 w-4 inline mr-2" />
              Image
            </button>
            <button
              type="button"
              onClick={() => {
                setMediaKind("video");
                setFile(null);
                setPreviewUrl("");
                setFileError("");
              }}
              className="flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all"
              style={mediaKind === "video" ? { background: "var(--brand)", color: "var(--txt)" } : { color: "var(--muted)" }}>
              <VideoIcon className="h-4 w-4 inline mr-2" />
              Video (≤60s)
            </button>
          </div>

          <div className="p-5 rounded-xl relative text-center" style={{ border: "2px dashed var(--line-2)" }}>
            {previewUrl ? (
              <div className="relative">
                {mediaKind === "video" ? (
                  <video src={previewUrl} controls className="w-full max-h-56 rounded-lg" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" className="w-full max-h-56 object-contain rounded-lg" />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-2 right-2"
                  style={{ background: "rgba(0,0,0,.6)" }}
                  onClick={() => {
                    setFile(null);
                    setPreviewUrl("");
                  }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div>
                {checkingFile ? (
                  <Loader2 className="mx-auto h-8 w-8 animate-spin" style={{ color: "var(--accent)" }} />
                ) : (
                  <Upload className="mx-auto h-8 w-8" style={{ color: "var(--faint)" }} />
                )}
                <p className="mt-2 fb-hint">
                  {checkingFile ? "Checking file..." : `Click to upload ${mediaKind === "video" ? "a video" : "an image"}`}
                </p>
              </div>
            )}
            <input
              type="file"
              accept={mediaKind === "video" ? "video/*" : "image/*"}
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={(e) => {
                const selected = e.target.files?.[0];
                if (selected) handleFileChange(selected);
              }}
            />
          </div>
          {fileError && <p className="fb-hint" style={{ color: "var(--spent)" }}>{fileError}</p>}

          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Campaign title" />
          </Field>
          <Field label="Description">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What are people sharing?" />
          </Field>

          <Button type="submit" variant="primary" disabled={createCampaign.isPending || checkingFile}>
            {createCampaign.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Post campaign
          </Button>
        </form>
      </Card>

      <Card tight>
        <p className="fb-hint px-3 pt-2 pb-1">Your campaigns ({campaigns?.length ?? 0})</p>
        {!campaigns || campaigns.length === 0 ? (
          <CardNote className="px-3 pb-3">No Promote &amp; Earn campaigns posted yet.</CardNote>
        ) : (
          <div>
            {campaigns.map((campaign) => (
              <div key={campaign._id} className="flex items-center gap-3 px-3 py-2.5" style={{ borderTop: "1px solid var(--line)" }}>
                <div className="min-w-0 flex-1">
                  <b style={{ fontSize: 13, color: "var(--txt)" }} className="block truncate">{campaign.title}</b>
                  <span className="fb-hint">
                    {campaign.mediaType === "video" ? "Video" : "Image"} · {(campaign.likeCount ?? 0).toLocaleString()} all-time likes
                  </span>
                </div>
                <Pill tone={campaign.status === "ACTIVE" ? "live" : "warn"} dot>
                  {campaign.status === "ACTIVE" ? "Active" : "Paused"}
                </Pill>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
