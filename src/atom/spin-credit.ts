import { atomWithStorage } from "jotai/utils";

const SPIN_CREDIT_KEY = "spin_credit_available";

function initializeSpinCredit(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(SPIN_CREDIT_KEY) === "true";
}

// Tracks whether the viewer has an unspent, locally-known spin credit. The
// API has no "spin credits available" GET endpoint (see use-spin.ts) — this
// is the only signal, and it must be shared reactively across the watch
// page and the persistent SpinMachine widget, hence a Jotai atom (mirrors
// userAtom's atomWithStorage pattern) rather than component-local state.
export const spinCreditAtom = atomWithStorage<boolean>(
  SPIN_CREDIT_KEY,
  initializeSpinCredit()
);
