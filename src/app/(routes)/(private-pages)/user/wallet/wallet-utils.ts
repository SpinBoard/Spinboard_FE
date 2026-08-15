// Pure helpers for the wallet page, kept free of React so they're easy to
// unit test in isolation.

export function formatCurrency(amount: number, currency: string = "NGN"): string {
  const symbol = currency === "NGN" ? "₦" : `${currency} `;
  return `${symbol}${amount.toLocaleString()}`;
}

// GET /wallet/balance's amountToThreshold/payoutThreshold pair, expressed
// as a 0-100 progress percentage toward the next weekly payout run.
export function payoutProgressPercent(balance: number, payoutThreshold: number): number {
  if (!Number.isFinite(payoutThreshold) || payoutThreshold <= 0) return 100;
  return Math.max(0, Math.min(100, Math.round((balance / payoutThreshold) * 100)));
}
