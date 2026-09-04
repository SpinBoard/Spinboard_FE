import { describe, it, expect } from "vitest";
import { validateBannerFile, buildAdCampaignFormData, TIER_META } from "./wizard-utils";

describe("validateBannerFile", () => {
  const config = {
    maxSizeBytes: 5 * 1024 * 1024,
    targetWidthPx: 1200,
    targetHeightPx: 675,
    aspectRatioTolerance: 0.05,
  };
  const dims = { width: 1200, height: 675 };

  it("rejects non-image mime types", () => {
    const file = new File(["x"], "clip.mp4", { type: "video/mp4" });
    const result = validateBannerFile(file, dims, config);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/JPEG, PNG, or WEBP/i);
  });

  it("rejects files over the max size", () => {
    const file = new File([new Uint8Array(10)], "banner.jpg", { type: "image/jpeg" });
    Object.defineProperty(file, "size", { value: config.maxSizeBytes + 1 });
    const result = validateBannerFile(file, dims, config);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/MB/);
  });

  it("rejects a banner far off the target aspect ratio", () => {
    const file = new File([new Uint8Array(10)], "banner.jpg", { type: "image/jpeg" });
    const result = validateBannerFile(file, { width: 1000, height: 1000 }, config);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/16:9/);
  });

  it("accepts a valid banner within limits", () => {
    const file = new File([new Uint8Array(10)], "banner.jpg", { type: "image/jpeg" });
    const result = validateBannerFile(file, dims, config);
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
    banner: new File(["img"], "banner.jpg", { type: "image/jpeg" }),
    tier: "basic" as const,
  };

  it("includes every contract-required field, nothing else", () => {
    const fd = buildAdCampaignFormData(baseData);
    expect(fd.get("title")).toBe("Summer Splash");
    expect(fd.get("description")).toBe("A fun summer campaign");
    expect(fd.get("brandUrl")).toBe("https://brand.example.com");
    expect(fd.get("campaignUrl")).toBeNull(); // empty string omitted
    expect(fd.get("banner")).toBeInstanceOf(File);
    expect(fd.get("tier")).toBe("basic");
  });

  it("omits removed fields (questions, global, geoTarget, numberOfWeeks, video)", () => {
    const fd = buildAdCampaignFormData(baseData);
    for (const removedField of ["questions", "global", "geoTarget", "numberOfWeeks", "video"]) {
      expect(fd.has(removedField)).toBe(false);
    }
  });
});
