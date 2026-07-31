import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createStore, Provider } from "jotai";
import { userAtom } from "@/atom/user";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/user/referrals",
}));

const myStats = {
  success: true,
  month: "2026-07",
  stats: {
    totalReferrals: 5,
    pendingReferrals: 2,
    successfulReferralsThisMonth: 3,
    referralPointsThisMonth: 15,
    totalReferralPointsAllTime: 40,
    referredUsersThisMonth: [
      {
        userId: "u1",
        fullName: "Dana Diaz",
        username: "dana",
        successfulAt: "2026-07-01T00:00:00Z",
        pointsAwarded: 5,
      },
    ],
  },
};

const events = {
  success: true,
  events: [
    {
      _id: "e1",
      type: "signup",
      referredUser: { username: "erin" },
      createdAt: "2026-07-02T00:00:00Z",
    },
    {
      _id: "e2",
      type: "referral_credited",
      referredUser: { username: "dana" },
      createdAt: "2026-07-01T00:00:00Z",
    },
  ],
};

vi.mock("axios", () => {
  const instance = {
    get: vi.fn((url: string) => {
      if (url.includes("/referrals/my-stats")) {
        return Promise.resolve({ data: myStats });
      }
      if (url.includes("/referrals/events")) {
        return Promise.resolve({ data: events });
      }
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    }),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
  return { default: { ...instance, create: () => instance } };
});

import ReferralsPage from "./page";

function renderPage() {
  const store = createStore();
  store.set(userAtom, {
    id: "user1",
    fullName: "Test User",
    username: "testuser",
    email: "user@test.com",
    userType: "gamer" as const,
    isVerified: true,
    createdAt: "2026-01-01",
    accessToken: "test-token",
    refreshToken: "test-refresh",
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ReferralsPage />
      </QueryClientProvider>
    </Provider>
  );
}

describe("ReferralsPage", () => {
  it("explains qualification (email verified + profile complete + 1 full ad cycle), not the old points mechanic", async () => {
    renderPage();
    expect(
      await screen.findByText(/verifies their email, completes their profile, and/i)
    ).toBeInTheDocument();
    expect(screen.queryByText(/21 lifetime points/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bonus points/i)).not.toBeInTheDocument();
  });

  it("shows progress toward the 20 and 40 qualified-referral discount thresholds", async () => {
    renderPage();
    await screen.findByText(/verifies their email/i);

    expect(screen.getByText("3")).toBeInTheDocument(); // qualified count
    expect(screen.getAllByText("Qualified Referrals").length).toBeGreaterThan(0);
    // 3 qualified so far → 17 more to the 20% off threshold
    expect(screen.getByText("17")).toBeInTheDocument();
    expect(screen.getByText("To next 20% off")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // pending count
    expect(screen.getByText("Pending")).toBeInTheDocument();
  });

  it("labels recent activity events using qualification language, not points", async () => {
    renderPage();
    expect(
      await screen.findByText(/pending until they qualify/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/one step closer to your next discount code/i)).toBeInTheDocument();
    expect(screen.queryByText(/pts/i)).not.toBeInTheDocument();
  });
});
