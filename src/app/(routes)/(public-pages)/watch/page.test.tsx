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

function ad(campaignId: string, adsWatchedSoFar: number) {
  return {
    success: true,
    adsWatchedSoFar,
    ad: {
      campaignId,
      title: `Ad ${campaignId}`,
      description: "desc",
      brandUrl: "https://brand.example",
      videoUrl: "https://cdn.example/video.mp4",
      videoDurationSeconds: 90,
      questions: [
        { question: "Q1?", choices: ["A", "B"] },
        { question: "Q2?", choices: ["C", "D"] },
        { question: "Q3?", choices: ["E", "F"] },
      ],
    },
  };
}

let currentAd = ad("camp1", 2);
let quizSubmitResponse: {
  success: true;
  allCorrect: boolean;
  attemptsSoFar: number;
  cycleCompleted: boolean;
  spinCreditGranted: boolean;
};

const axiosGet = vi.fn();
const axiosPost = vi.fn();
vi.mock("axios", () => {
  const instance = {
    get: (...args: unknown[]) => axiosGet(...(args as [string])),
    post: (...args: unknown[]) => axiosPost(...(args as [string])),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
  return { default: { ...instance, create: () => instance } };
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
    currentAd = ad("camp1", 2);
    axiosGet.mockImplementation((url: string) => {
      if (url.includes("/ads/next")) return Promise.resolve({ data: currentAd });
      if (url.includes("/admin/config")) return Promise.reject({ response: { status: 403 } });
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    });
    axiosPost.mockImplementation((url: string) => {
      if (url.includes("/video/start") || url.includes("/video/complete")) {
        return Promise.resolve({ data: { success: true } });
      }
      if (url.includes("/quiz/submit")) {
        return Promise.resolve({ data: quizSubmitResponse });
      }
      return Promise.reject(new Error(`Unhandled POST ${url}`));
    });
  });

  it("renders the video and the quiz on the same page, with a responsive side-by-side layout", async () => {
    renderPage();
    const heading = await screen.findByText("Ad camp1");
    expect(heading).toBeInTheDocument();

    // Video and quiz mount together — proves the "same page" requirement.
    expect(document.querySelector("video")).toBeInTheDocument();
    expect(screen.getByTestId("quiz-panel")).toBeInTheDocument();

    // Desktop: side-by-side (lg:grid-cols-2). Mobile: stacked (grid-cols-1,
    // the default before the lg breakpoint applies) — same DOM, CSS handles
    // the responsive switch, so asserting the responsive classes covers
    // both widths without needing a real viewport.
    const layout = heading.closest(".grid");
    expect(layout?.className).toContain("grid-cols-1");
    expect(layout?.className).toContain("lg:grid-cols-2");
  });

  it("shows cycle position out of the configured ads-per-cycle", async () => {
    currentAd = ad("camp1", 2); // 3rd ad in a 5-ad cycle
    renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("cycle-progress")).toHaveTextContent("Ad 3 of 5")
    );
  });

  it("requires all 3 answers before submit, and shows a retry banner on a wrong pass", async () => {
    quizSubmitResponse = {
      success: true,
      allCorrect: false,
      attemptsSoFar: 1,
      cycleCompleted: false,
      spinCreditGranted: false,
    };
    renderPage();
    await screen.findByTestId("quiz-panel");

    const user = userEvent.setup();
    await user.click(screen.getByTestId("quiz-choice-0-0"));
    await user.click(screen.getByTestId("quiz-choice-1-0"));
    await user.click(screen.getByTestId("quiz-choice-2-0"));
    await user.click(screen.getByRole("button", { name: /submit answers/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/wrong/i);
    // Unlimited retries — the quiz panel (not a dead end) is still shown.
    expect(screen.getByTestId("quiz-panel")).toBeInTheDocument();
  });

  it("on the 5th ad's passed quiz, activates the spin machine and advances via Next", async () => {
    currentAd = ad("camp5", 4); // 5th ad
    quizSubmitResponse = {
      success: true,
      allCorrect: true,
      attemptsSoFar: 1,
      cycleCompleted: true,
      spinCreditGranted: true,
    };
    renderPage();
    await screen.findByTestId("quiz-panel");

    const user = userEvent.setup();
    await user.click(screen.getByTestId("quiz-choice-0-0"));
    await user.click(screen.getByTestId("quiz-choice-1-0"));
    await user.click(screen.getByTestId("quiz-choice-2-0"));
    await user.click(screen.getByRole("button", { name: /submit answers/i }));

    expect(await screen.findByTestId("next-ad-button")).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId("spin-machine")).toHaveAttribute("data-state", "active")
    );
  });
});
