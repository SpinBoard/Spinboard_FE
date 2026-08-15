import { describe, it, expect } from "vitest";
import { formatCurrency, payoutProgressPercent } from "./wallet-utils";

describe("formatCurrency", () => {
  it("formats NGN with a naira symbol by default", () => {
    expect(formatCurrency(7000)).toBe("₦7,000");
  });

  it("formats other currencies with a code prefix", () => {
    expect(formatCurrency(50, "USD")).toBe("USD 50");
  });
});

describe("payoutProgressPercent", () => {
  it("returns 0 for a zero balance", () => {
    expect(payoutProgressPercent(0, 1500)).toBe(0);
  });

  it("returns a proportional percentage below threshold", () => {
    expect(payoutProgressPercent(750, 1500)).toBe(50);
  });

  it("caps at 100 once at or above threshold", () => {
    expect(payoutProgressPercent(2300, 1500)).toBe(100);
    expect(payoutProgressPercent(1500, 1500)).toBe(100);
  });

  it("treats a non-positive threshold as already met", () => {
    expect(payoutProgressPercent(0, 0)).toBe(100);
  });
});
