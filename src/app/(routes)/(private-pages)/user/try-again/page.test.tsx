import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createStore, Provider } from "jotai";
import { userAtom } from "@/atom/user";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/user/try-again",
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

let tryAgainCount = 12;
const axiosPost = vi.fn();
vi.mock("axios", () => {
  const instance = {
    get: vi.fn((url: string) => {
      if (url.includes("/spins/try-again/status")) {
        return Promise.resolve({
          data: {
            success: true,
            tryAgainCount,
            distanceToNextBenchmarks: { "50": 50 - tryAgainCount, "100": 100 - tryAgainCount },
          },
        });
      }
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    }),
    post: (...args: unknown[]) => axiosPost(...args),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
  return { default: { ...instance, create: () => instance } };
});

import TryAgainPage from "./page";

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const store = createStore();
  store.set(userAtom, loggedInUser);
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <TryAgainPage />
      </QueryClientProvider>
    </Provider>
  );
}

describe("TryAgainPage (special boards)", () => {
  beforeEach(() => {
    axiosPost.mockReset();
  });

  it("locks both boards below 50 try-agains", async () => {
    tryAgainCount = 12;
    renderPage();
    await waitFor(() => expect(screen.getByTestId("try-again-count")).toHaveTextContent("12"));
    expect(screen.getByTestId("board-50")).toHaveTextContent("Need 38 more try-agains to unlock.");
    expect(screen.getByTestId("board-100")).toHaveTextContent("Need 88 more try-agains to unlock.");
    expect(screen.queryByRole("button", { name: /spend 50/i })).not.toBeInTheDocument();
  });

  it("unlocks the 20% board at 50, showing the remaining balance after spending", async () => {
    tryAgainCount = 65;
    renderPage();
    await waitFor(() => expect(screen.getByTestId("try-again-count")).toHaveTextContent("65"));
    expect(screen.getByTestId("board-50")).toHaveTextContent("Remaining balance after spending: 15");
    expect(screen.getByRole("button", { name: /spend 50 & spin/i })).toBeEnabled();
    // 100 board still locked at 65
    expect(screen.getByTestId("board-100")).toHaveTextContent("Need 35 more try-agains to unlock.");
  });

  it("unlocks both boards at 100+", async () => {
    tryAgainCount = 130;
    renderPage();
    await waitFor(() => expect(screen.getByTestId("try-again-count")).toHaveTextContent("130"));
    expect(screen.getByTestId("board-50")).toHaveTextContent("Remaining balance after spending: 80");
    expect(screen.getByTestId("board-100")).toHaveTextContent("Remaining balance after spending: 30");
  });

  it("spends 50 and shows the guaranteed-win result with no try-again possible", async () => {
    tryAgainCount = 65;
    axiosPost.mockImplementation((url: string, body: unknown) => {
      if (url.includes("/spins/try-again/spend")) {
        expect(body).toEqual({ benchmark: 50 });
        return Promise.resolve({
          data: {
            success: true,
            spin: { _id: "spinX", outcomeType: "discount20", decision: "pending" },
            tryAgainStatus: { tryAgainCount: 15, distanceToNextBenchmarks: { "50": 35, "100": 85 } },
          },
        });
      }
      if (url.includes("/spins/wins/")) {
        return Promise.resolve({ data: { success: true } });
      }
      return Promise.reject(new Error(`Unhandled POST ${url}`));
    });

    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /spend 50 & spin/i }));

    expect(await screen.findByText("20% off!")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /redeem code/i }));
    await waitFor(() => expect(screen.queryByText("20% off!")).not.toBeInTheDocument());
  });
});
