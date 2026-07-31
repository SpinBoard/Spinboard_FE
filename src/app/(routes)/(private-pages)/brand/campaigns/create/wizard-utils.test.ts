import { describe, it, expect } from "vitest";
import {
  validateVideoFile,
  validateQuizQuestions,
  buildAdCampaignFormData,
  QUIZ_QUESTION_COUNT,
  TIER_META,
} from "./wizard-utils";

describe("validateVideoFile", () => {
  const config = { maxDurationSeconds: 95, maxSizeBytes: 100 * 1024 * 1024 };

  it("rejects non-video files", () => {
    const file = new File(["x"], "clip.jpg", { type: "image/jpeg" });
    const result = validateVideoFile(file, 30, config);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/video file/i);
  });

  it("rejects files over the max size", () => {
    const file = new File([new Uint8Array(10)], "clip.mp4", { type: "video/mp4" });
    Object.defineProperty(file, "size", { value: config.maxSizeBytes + 1 });
    const result = validateVideoFile(file, 30, config);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/MB/);
  });

  it("rejects videos longer than the max duration", () => {
    const file = new File([new Uint8Array(10)], "clip.mp4", { type: "video/mp4" });
    const result = validateVideoFile(file, 200, config);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/seconds/);
  });

  it("accepts a valid ~90s video within limits", () => {
    const file = new File([new Uint8Array(10)], "clip.mp4", { type: "video/mp4" });
    const result = validateVideoFile(file, 90, config);
    expect(result.valid).toBe(true);
  });
});

describe("validateQuizQuestions", () => {
  const validQuestion = () => ({
    question: "What color is the sky?",
    choices: ["Red", "Blue", "Green", "Yellow"],
    correctIndex: 1,
  });

  it("requires exactly QUIZ_QUESTION_COUNT questions", () => {
    const result = validateQuizQuestions([validQuestion(), validQuestion()]);
    expect(result.valid).toBe(false);
    expect(result.message).toContain(String(QUIZ_QUESTION_COUNT));
  });

  it("rejects a question that is too short", () => {
    const questions = [validQuestion(), validQuestion(), { ...validQuestion(), question: "Hi" }];
    const result = validateQuizQuestions(questions);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/5 characters/);
  });

  it("rejects a question missing a choice", () => {
    const questions = [
      validQuestion(),
      validQuestion(),
      { ...validQuestion(), choices: ["Red", "Blue", "", "Yellow"] },
    ];
    const result = validateQuizQuestions(questions);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/4 non-empty choices/);
  });

  it("rejects an out-of-range correctIndex", () => {
    const questions = [validQuestion(), validQuestion(), { ...validQuestion(), correctIndex: 9 }];
    const result = validateQuizQuestions(questions);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/correct answer/);
  });

  it("accepts exactly 3 well-formed questions", () => {
    const questions = [validQuestion(), validQuestion(), validQuestion()];
    expect(validateQuizQuestions(questions).valid).toBe(true);
  });
});

describe("TIER_META", () => {
  it("prices tiers at $20 / $30 / $50", () => {
    expect(TIER_META.map((t) => t.priceUSD)).toEqual([20, 30, 50]);
  });

  it("only grants analytics to premium and pro", () => {
    expect(TIER_META.find((t) => t.id === "basic")?.analytics).toBe(false);
    expect(TIER_META.find((t) => t.id === "premium")?.analytics).toBe(true);
    expect(TIER_META.find((t) => t.id === "pro")?.analytics).toBe(true);
  });

  it("only grants the global-visibility toggle to pro", () => {
    expect(TIER_META.find((t) => t.id === "basic")?.globalToggle).toBe(false);
    expect(TIER_META.find((t) => t.id === "premium")?.globalToggle).toBe(false);
    expect(TIER_META.find((t) => t.id === "pro")?.globalToggle).toBe(true);
  });
});

describe("buildAdCampaignFormData", () => {
  const baseData = {
    title: "Summer Splash",
    description: "A fun summer campaign",
    brandUrl: "https://brand.example.com",
    campaignUrl: "",
    video: new File(["vid"], "video.mp4", { type: "video/mp4" }),
    questions: [
      { question: "Q1 goes here", choices: ["A", "B", "C", "D"], correctIndex: 0 },
      { question: "Q2 goes here", choices: ["A", "B", "C", "D"], correctIndex: 1 },
      { question: "Q3 goes here", choices: ["A", "B", "C", "D"], correctIndex: 2 },
    ],
    tier: "basic" as const,
  };

  it("includes every contract-required field", () => {
    const fd = buildAdCampaignFormData(baseData);
    expect(fd.get("title")).toBe("Summer Splash");
    expect(fd.get("description")).toBe("A fun summer campaign");
    expect(fd.get("brandUrl")).toBe("https://brand.example.com");
    expect(fd.get("campaignUrl")).toBeNull(); // empty string omitted
    expect(fd.get("video")).toBeInstanceOf(File);
    expect(fd.get("tier")).toBe("basic");
  });

  it("serializes exactly 3 questions as JSON", () => {
    const fd = buildAdCampaignFormData(baseData);
    const questions = JSON.parse(fd.get("questions") as string);
    expect(questions).toHaveLength(3);
    expect(questions[0]).toEqual(baseData.questions[0]);
  });

  it("omits `global` for non-pro tiers even if the flag is set", () => {
    const fd = buildAdCampaignFormData({ ...baseData, tier: "premium", global: true });
    expect(fd.has("global")).toBe(false);
  });

  it("includes `global` only for pro when set", () => {
    const fd = buildAdCampaignFormData({ ...baseData, tier: "pro", global: true });
    expect(fd.get("global")).toBe("true");
  });

  it("omits removed legacy fields (gameType, image, words, prizeDescription, packageId)", () => {
    const fd = buildAdCampaignFormData(baseData);
    for (const removedField of ["gameType", "image", "words", "prizeDescription", "packageId"]) {
      expect(fd.has(removedField)).toBe(false);
    }
  });
});
