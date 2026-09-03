"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Card } from "@/components/ui/freebiz-card";
import { Field } from "@/components/ui/freebiz-field";
import { Input, Textarea } from "@/components/ui/freebiz-input";
import { Button } from "@/components/ui/freebiz-button";
import { Pill } from "@/components/ui/freebiz-pill";
import { Progress } from "@/components/ui/freebiz-progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  Save,
  X,
  Rocket,
  Clock,
} from "lucide-react";
import { routes } from "@/app/_utils/routes";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { api } from "@/lib/api";
import { apiErrorMessage } from "@/app/_utils/helper";
import { useAdminConfig } from "@/hooks/use-admin-config";
import { AdCampaign, AdCampaignResponse } from "@/types";
import { GoLiveDialog } from "@/components/brand/go-live-dialog";
import {
  TIER_META,
  getVideoDuration,
  validateVideoFile,
  buildAdCampaignFormData,
} from "./wizard-utils";

const wizardSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  brandUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  campaignUrl: z
    .string()
    .url("Please enter a valid URL")
    .optional()
    .or(z.literal("")),
  video: z
    .any()
    .refine((f) => f instanceof File && f.size > 0, "Please upload a campaign video"),
  tier: z.enum(["basic", "premium"]),
});

type WizardFormData = z.infer<typeof wizardSchema>;

const STEPS = ["Details", "Video", "Tier", "Review"] as const;

const STEP_FIELDS: (keyof WizardFormData)[][] = [
  ["title", "description", "brandUrl", "campaignUrl"],
  ["video"],
  ["tier"],
  [],
];

// design/freebiz-mockup.html data-screen="b-new". DECISIONS.md's note for
// this row ("one scroll, no wizard steps") describes the mockup's own
// layout, but the real screen's 4-step wizard (with step-gated validation,
// and a page.test.tsx built entirely around that interaction) is a
// deliberate keep — see the "keep the step wizard" call made before this
// rebuild. Only the markup/styling changes here, step by step.
//
// The mockup's own "Send for review" button and "What happens next: Review
// → Cleared or sent back → On the board" card describe a pre-publish
// moderation queue that doesn't exist — BUSINESS_RULES.md is explicit that
// paying goes live immediately, no review wait. Its "Starts/Ends/Days"
// scheduling fields and VAT-inclusive multi-week cost estimate are also
// fictional: pricing is flat USD, 30-day activation, no day-of-week
// scheduling and no location targeting at all. All of that is replaced
// with the real flat-price/activation copy the wizard already used.
export default function CreateCampaignWizardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { get: getConfig } = useAdminConfig();
  const tiers = getConfig("campaign.tiers");
  const activeDurationDays = getConfig("campaign.activeDurationDays");

  const [step, setStep] = useState(0);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>("");
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number | null>(null);
  const [videoError, setVideoError] = useState<string>("");
  const [videoChecking, setVideoChecking] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [createdCampaign, setCreatedCampaign] = useState<AdCampaign | null>(null);
  const [apiError, setApiError] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showGoLive, setShowGoLive] = useState(false);

  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      title: "",
      description: "",
      brandUrl: "",
      campaignUrl: "",
      video: undefined,
      tier: "basic",
    },
  });

  const tier = form.watch("tier");
  const selectedTierMeta = TIER_META.find((t) => t.id === tier)!;
  const priceUSD = tiers?.[tier]?.price ?? selectedTierMeta.priceUSD;
  const errors = form.formState.errors;

  const createCampaignMutation = useMutation({
    mutationFn: async (formData: FormData) =>
      api.post<AdCampaignResponse>(ENDPOINTS.AD_CAMPAIGNS, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (evt.total) setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
        },
      }),
    onSuccess: (response) => {
      if (!response.data.success) return;
      setCreatedCampaign(response.data.campaign);
      // Without this, the campaigns list keeps serving its cached result
      // (staleTime is 5 minutes globally, see src/lib/query-client.ts) and
      // a brand landing back on /brand/campaigns right after creating a
      // draft won't see it until the cache naturally expires.
      queryClient.invalidateQueries({ queryKey: ["ad-campaigns-mine"] });
    },
    onError: (error) => {
      setApiError(apiErrorMessage(error, "Failed to create campaign. Please try again."));
      setShowSubmitModal(false);
      setUploadProgress(0);
    },
  });

  const isSubmitting = createCampaignMutation.isPending;

  const handleVideoChange = async (file: File) => {
    setVideoError("");
    setVideoChecking(true);
    form.setValue("video", undefined, { shouldValidate: false });
    setVideoDurationSeconds(null);
    try {
      const duration = await getVideoDuration(file);
      const result = validateVideoFile(file, duration, {
        maxDurationSeconds: getConfig("video.maxDurationSeconds"),
        maxSizeBytes: getConfig("video.maxSizeBytes"),
      });
      setVideoDurationSeconds(duration);
      if (!result.valid) {
        setVideoError(result.message ?? "Invalid video file.");
        setVideoPreviewUrl("");
        return;
      }
      form.setValue("video", file, { shouldValidate: true });
      setVideoPreviewUrl(URL.createObjectURL(file));
    } catch (err) {
      setVideoError(err instanceof Error ? err.message : "Could not read video file.");
    } finally {
      setVideoChecking(false);
    }
  };

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    };
  }, [videoPreviewUrl]);

  const goNext = async () => {
    const fields = STEP_FIELDS[step];
    const valid =
      fields.length === 0 ? true : await form.trigger(fields as (keyof WizardFormData)[]);
    if (step === 1 && (!!videoError || videoChecking || !form.getValues("video"))) return;
    if (!valid) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleCreate = () => {
    const data = form.getValues();
    setApiError("");
    setUploadProgress(0);
    const formData = buildAdCampaignFormData({
      title: data.title,
      description: data.description,
      brandUrl: data.brandUrl,
      campaignUrl: data.campaignUrl,
      video: data.video,
      tier: data.tier,
    });
    createCampaignMutation.mutate(formData);
  };

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
          Brands / New campaign
        </p>
        <h1
          className="mt-1"
          style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 27, letterSpacing: "-0.02em", color: "var(--txt)" }}>
          Put an ad on the board
        </h1>
        <p className="mt-1" style={{ color: "var(--muted)", fontSize: 13.5 }}>
          One video, sixty seconds or less. No questions, no quiz — the board does the rest.
        </p>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-1 flex-shrink-0">
            <span
              data-testid={`wizard-step-${i}`}
              className="fb-pill"
              style={
                i === step
                  ? { color: "var(--ink-900)", background: "var(--accent)", borderColor: "transparent" }
                  : i < step
                    ? { color: "var(--accent)", borderColor: "var(--line-2)" }
                    : undefined
              }>
              {i < step ? <CheckCircle className="h-3 w-3" /> : <span>{i + 1}</span>}
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-4 h-px" style={{ background: "var(--line-2)" }} />}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setShowSubmitModal(true);
        }}
        className="space-y-4">
        {step === 0 && (
          <Card>
            <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Name and details</h3>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Campaign Title" htmlFor="title">
                <Input id="title" placeholder="Enter campaign title..." {...form.register("title")} />
                {errors.title && <span className="fb-hint mt-1" style={{ color: "var(--spent)" }}>{errors.title.message}</span>}
              </Field>
              <Field label="Brand URL (Optional)" htmlFor="brandUrl">
                <Input id="brandUrl" type="url" placeholder="https://your-brand.com" {...form.register("brandUrl")} />
                {errors.brandUrl && <span className="fb-hint mt-1" style={{ color: "var(--spent)" }}>{errors.brandUrl.message}</span>}
              </Field>
              <Field label="Description" htmlFor="description" className="sm:col-span-2" hint="Plain, specific descriptions read better than slogans.">
                <Textarea id="description" rows={3} placeholder="Describe your campaign..." {...form.register("description")} />
                {errors.description && <span className="fb-hint mt-1" style={{ color: "var(--spent)" }}>{errors.description.message}</span>}
              </Field>
              <Field label="Campaign URL (Optional)" htmlFor="campaignUrl" className="sm:col-span-2">
                <Input id="campaignUrl" type="url" placeholder="https://your-brand.com/campaign" {...form.register("campaignUrl")} />
                {errors.campaignUrl && <span className="fb-hint mt-1" style={{ color: "var(--spent)" }}>{errors.campaignUrl.message}</span>}
              </Field>
            </div>
          </Card>
        )}

        {step === 1 && (
          <Card>
            <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Ad Video</h3>
            <p className="fb-hint mt-1">
              Plays continuously in the billboard rotation. Max {Math.round(getConfig("video.maxDurationSeconds"))}s,{" "}
              {Math.round(getConfig("video.maxSizeBytes") / (1024 * 1024))}MB.
            </p>
            <div className="mt-3 p-6 rounded-xl relative text-center" style={{ border: "2px dashed var(--line-2)" }}>
              {videoPreviewUrl ? (
                <div className="relative">
                  <video src={videoPreviewUrl} controls className="w-full max-h-64 rounded-lg" />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    style={{ background: "rgba(0,0,0,.6)" }}
                    onClick={() => {
                      setVideoPreviewUrl("");
                      setVideoDurationSeconds(null);
                      form.setValue("video", undefined, { shouldValidate: true });
                    }}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  {videoChecking ? (
                    <Loader2 className="mx-auto h-10 w-10 animate-spin" style={{ color: "var(--accent)" }} />
                  ) : (
                    <Upload className="mx-auto h-10 w-10" style={{ color: "var(--faint)" }} />
                  )}
                  <p className="mt-2 fb-hint">{videoChecking ? "Checking video..." : "Click to upload your ad video"}</p>
                </div>
              )}
              <input
                type="file"
                accept="video/*"
                data-testid="video-input"
                className="absolute inset-0 opacity-0 cursor-pointer"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleVideoChange(file);
                }}
              />
            </div>
            {videoDurationSeconds !== null && !videoError && (
              <p className="mt-2 flex items-center gap-2" style={{ color: "var(--live)", fontSize: 13 }}>
                <CheckCircle className="h-4 w-4" />
                {Math.round(videoDurationSeconds)}s, looks good.
              </p>
            )}
            {videoError && (
              <p className="mt-2 flex items-center gap-2" style={{ color: "var(--spent)", fontSize: 13 }}>
                <AlertCircle className="h-4 w-4" />
                {videoError}
              </p>
            )}
          </Card>
        )}

        {step === 2 && (
          <Card>
            <h3 style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>Choose your tier</h3>
            <p className="fb-hint mt-1">
              Flat price, {activeDurationDays}-day activation — no weeks to pick. Premium gets a higher
              rotation weight plus the analytics dashboard.
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TIER_META.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  data-testid={`tier-card-${t.id}`}
                  onClick={() => form.setValue("tier", t.id, { shouldValidate: true })}
                  className="text-left p-4 rounded-xl"
                  style={{
                    border: `2px solid ${tier === t.id ? "var(--accent)" : "var(--line-2)"}`,
                    background: tier === t.id ? "var(--accent-soft)" : "transparent",
                  }}>
                  <b style={{ fontFamily: "var(--display)", fontSize: 16, color: "var(--txt)" }}>{t.name}</b>
                  <p className="mt-1" style={{ fontFamily: "var(--mono)", fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>
                    ${tiers?.[t.id]?.price ?? t.priceUSD}
                    <span className="fb-hint" style={{ fontFamily: "var(--body)", fontWeight: 400 }}> / {activeDurationDays} days</span>
                  </p>
                  <p className="fb-hint mb-2">{t.blurb}</p>
                  <Pill tone={t.analytics ? "live" : "default"} dot={t.analytics}>
                    Analytics dashboard {t.analytics ? "included" : "not included"}
                  </Pill>
                </button>
              ))}
            </div>
            <p className="fb-hint mt-3">
              The board is global — everyone everywhere sees every ad. There is no location targeting.
            </p>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <h3 className="flex items-center gap-2" style={{ fontFamily: "var(--display)", fontSize: 15, color: "var(--txt)" }}>
              <CheckCircle className="h-4 w-4" style={{ color: "var(--accent)" }} />
              Review
            </h3>
            <div className="mt-3 space-y-2" style={{ fontSize: 13 }}>
              <div className="flex justify-between">
                <span className="fb-hint">Title</span>
                <span style={{ color: "var(--txt)" }}>{form.getValues("title")}</span>
              </div>
              <div className="flex justify-between">
                <span className="fb-hint">Tier</span>
                <span style={{ color: "var(--txt)", textTransform: "capitalize" }}>{tier}</span>
              </div>
              <div className="pt-3 flex items-start gap-2 fb-hint" style={{ borderTop: "1px solid var(--line)" }}>
                <Clock className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                This creates your campaign as a draft. Going live charges ${priceUSD} flat and starts a{" "}
                {activeDurationDays}-day activation window — the campaign appears on the billboard the instant
                payment succeeds.
              </div>
            </div>
          </Card>
        )}

        <div className="flex items-center justify-between pt-1">
          <Button type="button" variant="ghost" onClick={goBack} disabled={step === 0 || isSubmitting}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button type="button" variant="primary" onClick={goNext} disabled={step === 1 && (videoChecking || !!videoError)}>
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button type="submit" variant="primary" disabled={isSubmitting}>
              <CheckCircle className="h-4 w-4" />
              Create Campaign
            </Button>
          )}
        </div>

        {apiError && (
          <div className="p-3 rounded-lg flex items-center gap-2" style={{ background: "rgba(255,77,94,.1)", border: "1px solid rgba(255,77,94,.3)", color: "var(--spent)" }}>
            <AlertCircle className="h-4 w-4" />
            <span style={{ fontSize: 13 }}>{apiError}</span>
          </div>
        )}
      </form>

      <Dialog open={showSubmitModal} onOpenChange={(open) => !isSubmitting && setShowSubmitModal(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-sora text-xl">
              {createdCampaign ? "Campaign created" : "Create Ad Campaign"}
            </DialogTitle>
            <DialogDescription>
              {createdCampaign
                ? "Your campaign is saved as a draft. Go live anytime to pay the flat tier price and start its 30-day activation."
                : "This creates your campaign as a draft."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="fb-hint text-center">Uploading... {uploadProgress}%</p>
              </div>
            )}

            {!createdCampaign ? (
              <>
                <Button variant="primary" className="w-full justify-center" onClick={handleCreate} disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Create Draft
                </Button>
                <Button variant="ghost" className="w-full justify-center" onClick={() => setShowSubmitModal(false)} disabled={isSubmitting}>
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  className="w-full justify-center"
                  onClick={() => {
                    setShowSubmitModal(false);
                    setShowGoLive(true);
                  }}>
                  <Rocket className="h-4 w-4" />
                  Go Live Now
                </Button>
                <Button variant="ghost" className="w-full justify-center" onClick={() => router.push(routes.BRAND.CAMPAIGNS)}>
                  I&apos;ll do this later
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <GoLiveDialog
        campaign={createdCampaign}
        open={showGoLive}
        onOpenChange={(open) => {
          setShowGoLive(open);
          if (!open) router.push(routes.BRAND.CAMPAIGNS);
        }}
      />
    </div>
  );
}
