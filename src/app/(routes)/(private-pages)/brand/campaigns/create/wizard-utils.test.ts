import { describe, it, expect } from "vitest";
import { validateVideoFile, buildAdCampaignFormData, TIER_META } from "./wizard-utils";

describe("validateVideoFile", () => {
  const config = { maxDurationSeconds: 60, maxSizeBytes: 25 * 1024 * 1024 };

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
    const result = validateVideoFile(file, 90, config);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/seconds/);
  });

  it("accepts a valid video within limits", () => {
    const file = new File([new Uint8Array(10)], "clip.mp4", { type: "video/mp4" });
    const result = validateVideoFile(file, 30, config);
    expect(result.valid).toBe(true);
  });
});

describe("TIER_META", () => {
  it("prices tiers flat at $20 / $30, no per-week rate", () => {
    expect(TIER_META.map((t) => t.priceUSD)).toEqual([20, 30]);
  });

  it("only grants analytics to premium", () => {
    expect(TIER_META.find((t) => t.id === "basic")?.analytics).toBe(false);
    expect(TIER_META.find((t) => t.id === "premium")?.analytics).toBe(true);
  });

  it("has no pro tier and no global-visibility toggle field", () => {
    expect(TIER_META).toHaveLength(2);
    expect(TIER_META.map((t) => t.id)).toEqual(["basic", "premium"]);
    expect(TIER_META.every((t) => !("globalToggle" in t))).toBe(true);
  });
});

describe("buildAdCampaignFormData", () => {
  const baseData = {
    title: "Summer Splash",
    description: "A fun summer campaign",
    brandUrl: "https://brand.example.com",
    campaignUrl: "",
    video: new File(["vid"], "video.mp4", { type: "video/mp4" }),
    tier: "basic" as const,
  };

  it("includes every contract-required field, nothing else", () => {
    const fd = buildAdCampaignFormData(baseData);
    expect(fd.get("title")).toBe("Summer Splash");
    expect(fd.get("description")).toBe("A fun summer campaign");
    expect(fd.get("brandUrl")).toBe("https://brand.example.com");
    expect(fd.get("campaignUrl")).toBeNull(); // empty string omitted
    expect(fd.get("video")).toBeInstanceOf(File);
    expect(fd.get("tier")).toBe("basic");
  });

  it("omits removed fields (questions, global, geoTarget, numberOfWeeks)", () => {
    const fd = buildAdCampaignFormData(baseData);
    for (const removedField of ["questions", "global", "geoTarget", "numberOfWeeks"]) {
      expect(fd.has(removedField)).toBe(false);
    }
  });
});
