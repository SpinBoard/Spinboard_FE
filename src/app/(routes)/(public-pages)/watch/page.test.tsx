import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createStore, Provider } from "jotai";
import { userAtom } from "@/atom/user";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/watch",
}));

const loggedInUser = {
  id: "user1",
  fullName: "Test User",
  email: "user@test.com",
  userType: "gamer" as const,
  isVerified: true,
  createdAt: "2026-01-01",
  accessToken: "test-token",
  refreshToken: "test-refresh",
};

const queueSlot = {
  slotId: "slot_1",
  type: "AD" as const,
  campaignId: "camp1",
  brandName: "Naija Snacks Co.",
  title: "Crunch Time",
  videoUrl: "https://cdn.example/video.mp4",
  durationSec: 30,
};

const stripFeed = {
  serverTime: "2026-08-14T13:22:05.000Z",
  items: [
    {
      kind: "FREEBIE" as const,
      display: "PINNED" as const,
      positionHint: "TOP" as const,
      codeId: "code1",
      publicCode: "PZL7K2Q9",
      valueLabel: "₦500 MTN Airtime",
      type: "AIRTIME" as const,
      state: "AVAILABLE" as const,
      liveUntil: "2026-08-14T13:32:05.000Z",
    },
    { kind: "PROMO" as const, display: "SCROLLING" as const, text: "Eyes on the edges." },
  ],
};

const axiosGet = vi.fn();
const axiosPost = vi.fn();
vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => axiosGet(...(args as [string])),
    post: (...args: unknown[]) => axiosPost(...(args as [string])),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
  return { default: { ...instance, create: () => instance }, isAxiosError: () => false };
});

import WatchPage from "./page";

function renderPage(user: typeof loggedInUser | null = loggedInUser) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const store = createStore();
  store.set(userAtom, user);
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <WatchPage />
      </QueryClientProvider>
    </Provider>
  );
}

describe("WatchPage", () => {
  beforeEach(() => {
    localStorage.clear();
    axiosGet.mockReset();
    axiosPost.mockReset();
    axiosGet.mockImplementation((url: string) => {
      if (url.includes("/billboard/queue")) return Promise.resolve({ data: { success: true, slots: [queueSlot] } });
      if (url.includes("/freebies/strip")) return Promise.resolve({ data: stripFeed });
      if (url.includes("/admin/config")) return Promise.reject({ response: { status: 403 } });
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
    axiosPost.mockImplementation((url: string) => {
      if (url.includes("/billboard/session")) return Promise.resolve({ data: { success: true, sessionId: "sess1" } });
      if (url.includes("/billboard/impressions/heartbeat")) return Promise.resolve({ data: { success: true } });
      if (url.includes("/billboard/impressions/complete")) return Promise.resolve({ data: { success: true, completed: true } });
      if (url.includes("/freebies/apply")) {
        return Promise.resolve({
          data: { success: true, action: "CLAIMED", claimId: "c1", type: "AIRTIME", valueLabel: "₦500 MTN Airtime", secretCode: "SECRET123" },
        });
      }
      return Promise.reject(new Error(`Unhandled POST ${url}`));
    });
  });

  it("mints a session, loads the queue, and plays the first slot with no gate", async () => {
    renderPage();
    await waitFor(() => expect(axiosPost).toHaveBeenCalledWith("/billboard/session"));
    expect(await screen.findByText(/Crunch Time/)).toBeInTheDocument();
    expect(document.querySelector("video")).toBeInTheDocument();
    // No quiz panel, no spin machine — the billboard is never gated.
    expect(screen.queryByTestId("quiz-panel")).not.toBeInTheDocument();
    expect(screen.queryByTestId("spin-machine")).not.toBeInTheDocument();
  });

  it("renders the freebie strip with the pinned code and scrolling promo", async () => {
    renderPage();
    expect(await screen.findByText("PZL7K2Q9")).toBeInTheDocument();
    expect(screen.getAllByText("Eyes on the edges.").length).toBeGreaterThan(0);
  });

  it("the Apply box always renders and submits a code to /freebies/apply", async () => {
    renderPage();
    const input = await screen.findByPlaceholderText(/type a code/i);
    const user = userEvent.setup();
    await user.type(input, "PZL7K2Q9");
    await user.click(screen.getByRole("button", { name: /apply code/i }));

    await waitFor(() =>
      expect(axiosPost).toHaveBeenCalledWith(
        "/freebies/apply",
        { code: "PZL7K2Q9" },
        expect.anything()
      )
    );
    expect(await screen.findByText(/you won it/i)).toBeInTheDocument();
  });

  it("works with no logged-in user at all", async () => {
    renderPage(null);
    expect(await screen.findByText(/Crunch Time/)).toBeInTheDocument();
  });
});
