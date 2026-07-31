"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useAtomValue } from "jotai";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  CheckCircle,
  AlertCircle,
  Video as VideoIcon,
  FileText,
  HelpCircle,
  Loader2,
  CreditCard,
  Save,
  X,
  Globe,
  BarChart3,
} from "lucide-react";
import { routes } from "@/app/_utils/routes";
import { ENDPOINTS } from "@/app/_utils/endpoints";
import { api } from "@/lib/api";
import { useAdminConfig } from "@/hooks/use-admin-config";
import { userAtom } from "@/atom/user";
import { AdCampaignResponse } from "@/types";
import {
  QUIZ_QUESTION_COUNT,
  TIER_META,
  getVideoDuration,
  validateVideoFile,
  buildAdCampaignFormData,
} from "./wizard-utils";

const questionSchema = z.object({
  question: z.string().min(5, "Question must be at least 5 characters"),
  choices: z
    .array(z.string().min(1, "Choice cannot be empty"))
    .length(4, "Must have exactly 4 choices"),
  correctIndex: z.number().min(0).max(3),
});

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
  questions: z
    .array(questionSchema)
    .length(
      QUIZ_QUESTION_COUNT,
      `Exactly ${QUIZ_QUESTION_COUNT} quiz questions are required`
    ),
  tier: z.enum(["basic", "premium", "pro"]),
  global: z.boolean(),
});

type WizardFormData = z.infer<typeof wizardSchema>;

const STEPS = ["Details", "Video", "Quiz", "Tier", "Review"] as const;

const STEP_FIELDS: (keyof WizardFormData)[][] = [
  ["title", "description", "brandUrl", "campaignUrl"],
  ["video"],
  ["questions"],
  ["tier"],
  [],
];

const emptyQuestion = () => ({
  question: "",
  choices: ["", "", "", ""],
  correctIndex: 0,
});

export default function CreateCampaignWizardPage() {
  const router = useRouter();
  const user = useAtomValue(userAtom);
  const { get: getConfig } = useAdminConfig();
  const tierPrices = getConfig("campaign.tierPrices");

  const [step, setStep] = useState(0);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>("");
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number | null>(null);
  const [videoError, setVideoError] = useState<string>("");
  const [videoChecking, setVideoChecking] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [payAction, setPayAction] = useState<"idle" | "paying">("idle");

  const form = useForm<WizardFormData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      title: "",
      description: "",
      brandUrl: "",
      campaignUrl: "",
      video: undefined,
      questions: Array(QUIZ_QUESTION_COUNT).fill(null).map(emptyQuestion),
      tier: "basic",
      global: false,
    },
  });

  const { fields: questionFields } = useFieldArray({
    control: form.control,
    name: "questions",
  });

  const tier = form.watch("tier");
  const global = form.watch("global");
  const selectedTierMeta = TIER_META.find((t) => t.id === tier)!;
  const priceUSD = tierPrices?.[tier] ?? selectedTierMeta.priceUSD;

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
      setCreatedCampaignId(response.data.campaign._id);
    },
    onError: (error) => {
      const message = isAxiosError(error)
        ? (error.response?.data as { message?: string } | undefined)?.message
        : undefined;
      setApiError(message || "Failed to create campaign. Please try again.");
      setShowSubmitModal(false);
      setUploadProgress(0);
    },
  });

  const initializePayment = useMutation({
    mutationFn: async (payload: { campaignId: string; email: string }) =>
      api.post(ENDPOINTS.AD_PAYMENTS_INITIALIZE, payload),
    onSuccess: (response) => {
      const authorizationUrl = (response.data as { data?: { authorization_url?: string } })
        ?.data?.authorization_url;
      if (authorizationUrl) window.open(authorizationUrl, "_blank");
      setShowSubmitModal(false);
      router.push(routes.BRAND.CAMPAIGNS);
    },
    onError: () => {
      setPayAction("idle");
      setApiError(
        "Failed to start payment. Your campaign was saved as a draft — you can pay from the campaigns list."
      );
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
      questions: data.questions,
      tier: data.tier,
      global: data.tier === "pro" ? data.global : false,
    });
    createCampaignMutation.mutate(formData);
  };

  const handlePayNow = () => {
    if (!createdCampaignId || !user?.email) return;
    setPayAction("paying");
    initializePayment.mutate({ campaignId: createdCampaignId, email: user.email });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Link href={routes.BRAND.CAMPAIGNS}>
          <Button variant="outline" size="icon" className="border-border text-foreground hover:bg-white/10">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground font-sora">Create Ad Campaign</h1>
          <p className="text-muted-foreground">
            Upload your video ad, add a 3-question quiz, and pick a tier.
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-shrink-0">
              <div
                data-testid={`wizard-step-${i}`}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
                  i === step
                    ? "bg-primary text-primary-foreground"
                    : i < step
                      ? "bg-primary/20 text-primary"
                      : "bg-white/5 text-muted-foreground"
                }`}>
                {i < step ? <CheckCircle className="h-3 w-3" /> : <span>{i + 1}</span>}
                {label}
              </div>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-border" />}
            </div>
          ))}
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setShowSubmitModal(true);
          }}
          className="max-w-4xl mx-auto space-y-6">
          {step === 0 && (
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-foreground font-sora flex items-center gap-2">
                  <FileText className="h-5 w-5 text-secondary" />
                  Campaign Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Campaign Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter campaign title..." {...field} />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Describe your campaign..." className="min-h-[100px]" {...field} />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="brandUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Brand URL <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://your-brand.com" {...field} />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="campaignUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Campaign URL <span className="text-muted-foreground text-xs font-normal">(Optional)</span>
                      </FormLabel>
                      <FormControl>
                        <Input type="url" placeholder="https://your-brand.com/campaign" {...field} />
                      </FormControl>
                      <FormMessage className="text-destructive" />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-foreground font-sora flex items-center gap-2">
                  <VideoIcon className="h-5 w-5 text-secondary" />
                  Ad Video
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  ~90 seconds. Viewers watch this before the quiz. Max{" "}
                  {Math.round(getConfig("video.maxDurationSeconds"))}s,{" "}
                  {Math.round(getConfig("video.maxSizeBytes") / (1024 * 1024))}MB.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-8 relative">
                  {videoPreviewUrl ? (
                    <div className="relative">
                      <video src={videoPreviewUrl} controls className="w-full max-h-64 rounded-lg" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="absolute top-2 right-2 bg-black/50 border-border"
                        onClick={() => {
                          setVideoPreviewUrl("");
                          setVideoDurationSeconds(null);
                          form.setValue("video", undefined, { shouldValidate: true });
                        }}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center">
                      {videoChecking ? (
                        <Loader2 className="mx-auto h-10 w-10 text-secondary animate-spin" />
                      ) : (
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                      )}
                      <p className="mt-2 text-muted-foreground">
                        {videoChecking ? "Checking video..." : "Click to upload your ad video"}
                      </p>
                    </div>
                  )}
                  <Input
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
                  <p className="text-success text-sm flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    {Math.round(videoDurationSeconds)}s, looks good.
                  </p>
                )}
                {videoError && (
                  <p className="text-destructive text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {videoError}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-foreground font-sora flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-secondary" />
                  Quiz Questions
                  <span className="text-muted-foreground text-xs font-normal ml-1">
                    (exactly {QUIZ_QUESTION_COUNT})
                  </span>
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                  Viewers answer these after watching the video, with unlimited retries.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                {questionFields.map((question, questionIndex) => (
                  <div key={question.id} className="space-y-4 p-4 bg-white/5 rounded-lg border border-border">
                    <h4 className="text-foreground font-medium">Question {questionIndex + 1}</h4>
                    <FormField
                      control={form.control}
                      name={`questions.${questionIndex}.question`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Question</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter your question..." {...field} />
                          </FormControl>
                          <FormMessage className="text-destructive" />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      {Array.from({ length: 4 }).map((_, choiceIndex) => (
                        <FormField
                          key={choiceIndex}
                          control={form.control}
                          name={`questions.${questionIndex}.choices.${choiceIndex}`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="text-sm">
                                Choice {String.fromCharCode(65 + choiceIndex)}
                              </FormLabel>
                              <FormControl>
                                <Input placeholder={`Option ${String.fromCharCode(65 + choiceIndex)}`} {...field} />
                              </FormControl>
                              <FormMessage className="text-destructive" />
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormField
                      control={form.control}
                      name={`questions.${questionIndex}.correctIndex`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correct Answer</FormLabel>
                          <Select
                            onValueChange={(value) => field.onChange(parseInt(value))}
                            value={field.value.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select correct answer" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {["A", "B", "C", "D"].map((letter, index) => (
                                <SelectItem key={index} value={index.toString()}>
                                  Option {letter}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-destructive" />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {step === 3 && (
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-foreground font-sora">Choose your tier</CardTitle>
                <p className="text-muted-foreground text-sm">
                  Higher tiers get shown more often and unlock analytics.
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {TIER_META.map((t) => (
                    <button
                      type="button"
                      key={t.id}
                      data-testid={`tier-card-${t.id}`}
                      onClick={() => form.setValue("tier", t.id, { shouldValidate: true })}
                      className={`text-left p-4 rounded-xl border-2 transition-all ${
                        tier === t.id ? "border-primary bg-primary/10" : "border-border hover:border-white/30"
                      }`}>
                      <h4 className="font-sora font-bold text-lg text-foreground">{t.name}</h4>
                      <p className="text-2xl font-bold text-primary my-1">
                        ${tierPrices?.[t.id] ?? t.priceUSD}
                      </p>
                      <p className="text-xs text-muted-foreground mb-3">{t.blurb}</p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        <li className="flex items-center gap-1.5">
                          <BarChart3 className="h-3 w-3" /> {t.displayWeight} display weight
                        </li>
                        <li className="flex items-center gap-1.5">
                          <CheckCircle className={`h-3 w-3 ${t.analytics ? "text-success" : "opacity-30"}`} />
                          Analytics dashboard
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Globe className={`h-3 w-3 ${t.globalToggle ? "text-success" : "opacity-30"}`} />
                          Global visibility toggle
                        </li>
                      </ul>
                    </button>
                  ))}
                </div>

                {selectedTierMeta.globalToggle && (
                  <FormField
                    control={form.control}
                    name="global"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border border-border p-4">
                        <div>
                          <FormLabel>Show globally</FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Off shows only in your brand&apos;s country; on shows worldwide.
                          </p>
                        </div>
                        <FormControl>
                          <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
              </CardContent>
            </Card>
          )}

          {step === 4 && (
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardHeader>
                <CardTitle className="text-foreground font-sora flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-secondary" />
                  Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Title</span>
                  <span className="text-foreground">{form.getValues("title")}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tier</span>
                  <span className="text-foreground capitalize">{tier}</span>
                </div>
                {selectedTierMeta.globalToggle && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Visibility</span>
                    <span className="text-foreground">{global ? "Global" : "Home country only"}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-3">
                  <span className="text-foreground font-semibold">Total to Pay</span>
                  <span className="text-primary font-bold text-xl font-sora">${priceUSD}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={goBack}
              disabled={step === 0 || isSubmitting}
              className="border-border text-foreground hover:bg-white/10">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            {step < STEPS.length - 1 ? (
              <Button
                type="button"
                onClick={goNext}
                disabled={step === 1 && (videoChecking || !!videoError)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <CheckCircle className="h-4 w-4 mr-2" />
                Create Campaign
              </Button>
            )}
          </div>

          {apiError && (
            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{apiError}</span>
              </div>
            </div>
          )}
        </form>
      </Form>

      <Dialog
        open={showSubmitModal}
        onOpenChange={(open) => !isSubmitting && !initializePayment.isPending && setShowSubmitModal(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-sora text-xl">
              {createdCampaignId ? "Pay to activate" : "Create Ad Campaign"}
            </DialogTitle>
            <DialogDescription>
              {createdCampaignId
                ? `Your campaign is saved as a draft. Pay $${priceUSD} to activate it for 30 days.`
                : "This creates your campaign as a draft."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
              <div className="space-y-2">
                <Progress value={uploadProgress} />
                <p className="text-muted-foreground text-xs text-center">Uploading... {uploadProgress}%</p>
              </div>
            )}

            {!createdCampaignId ? (
              <>
                <Button
                  onClick={handleCreate}
                  disabled={isSubmitting}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 flex items-center justify-center gap-3">
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Create Draft
                </Button>
                <Button
                  onClick={() => setShowSubmitModal(false)}
                  disabled={isSubmitting}
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-foreground hover:bg-white/5">
                  Cancel
                </Button>
              </>
            ) : (
              <>
                <Button
                  onClick={handlePayNow}
                  disabled={payAction === "paying"}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 flex items-center justify-center gap-3">
                  {payAction === "paying" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4" />
                  )}
                  Pay Now
                </Button>
                <Button
                  onClick={() => router.push(routes.BRAND.CAMPAIGNS)}
                  disabled={payAction === "paying"}
                  variant="outline"
                  className="w-full border-border text-foreground hover:bg-white/10">
                  I&apos;ll pay later
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
