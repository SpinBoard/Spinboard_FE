import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createStore, Provider } from "jotai";
import { userAtom } from "@/atom/user";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
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

const axiosPost = vi.fn();
vi.mock("axios", () => {
  const instance = {
    get: vi.fn(() => Promise.reject(new Error("unhandled GET"))),
    post: (...args: unknown[]) => axiosPost(...args),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
  return {
    default: { ...instance, create: () => instance },
    isAxiosError: (err: unknown) => !!(err && typeof err === "object" && "response" in err),
  };
});

import { SpinMachine } from "./spin-machine";

function renderWidget(user: typeof loggedInUser | null) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const store = createStore();
  store.set(userAtom, user);
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <SpinMachine />
      </QueryClientProvider>
    </Provider>
  );
}

describe("SpinMachine", () => {
  beforeEach(() => {
    localStorage.clear();
    pushMock.mockClear();
    axiosPost.mockReset();
  });

  it("renders inactive (yellow, disabled) with no earned spin credit", async () => {
    renderWidget(loggedInUser);
    const widget = await screen.findByTestId("spin-machine");
    expect(widget).toHaveAttribute("data-state", "inactive");
    expect(screen.getByTestId("spin-button")).toBeDisabled();
  });

  it("renders active (green, enabled) once a spin credit is earned", async () => {
    localStorage.setItem("spin_credit_available", "true");
    renderWidget(loggedInUser);
    const widget = await screen.findByTestId("spin-machine");
    expect(widget).toHaveAttribute("data-state", "active");
    expect(screen.getByTestId("spin-button")).toBeEnabled();
  });

  it("routes an unregistered visitor to registration instead of firing the spin request", async () => {
    localStorage.setItem("spin_credit_available", "true");
    renderWidget(null);
    const user = userEvent.setup();
    await user.click(await screen.findByTestId("spin-button"));

    expect(pushMock).toHaveBeenCalledWith(
      expect.stringContaining("/register?type=user&returnTo=")
    );
    expect(axiosPost).not.toHaveBeenCalled();
    // the credit is preserved for after registration/profile completion
    expect(localStorage.getItem("spin_credit_available")).toBe("true");
  });

  it("spins, shows the result, and resets to inactive after a decision", async () => {
    localStorage.setItem("spin_credit_available", "true");
    axiosPost.mockImplementation((url: string) => {
      if (url.includes("/spins/wins/")) {
        return Promise.resolve({ data: { success: true } });
      }
      if (url === "/spins" || url.endsWith("/spins")) {
        return Promise.resolve({
          data: {
            success: true,
            spin: { _id: "spin1", outcomeType: "cash", decision: "pending" },
            tryAgainStatus: { tryAgainCount: 0, distanceToNextBenchmarks: { "50": 50, "100": 100 } },
          },
        });
      }
      return Promise.reject(new Error(`Unhandled POST ${url}`));
    });

    renderWidget(loggedInUser);
    const user = userEvent.setup();
    await user.click(await screen.findByTestId("spin-button"));

    expect(await screen.findByTestId("spin-result-modal")).toBeInTheDocument();
    expect(screen.getByText("You won cash!")).toBeInTheDocument();
    expect(screen.getByTestId("try-again-benchmark-copy")).toHaveTextContent(
      "You're at 0 try-agains. 50 more unlocks the 20% guaranteed board, 100 more unlocks the 50% guaranteed board."
    );

    await user.click(screen.getByRole("button", { name: /redeem current prize/i }));

    await waitFor(() =>
      expect(screen.queryByTestId("spin-result-modal")).not.toBeInTheDocument()
    );
    expect(screen.getByTestId("spin-machine")).toHaveAttribute("data-state", "inactive");
    expect(localStorage.getItem("spin_credit_available")).not.toBe("true");
  });

  it("lets the player continue trying instead of redeeming, forfeiting the prize but keeping the count", async () => {
    localStorage.setItem("spin_credit_available", "true");
    const decisionCalls: unknown[] = [];
    axiosPost.mockImplementation((url: string, body: unknown) => {
      if (url.includes("/spins/wins/")) {
        decisionCalls.push(body);
        return Promise.resolve({ data: { success: true } });
      }
      if (url === "/spins" || url.endsWith("/spins")) {
        return Promise.resolve({
          data: {
            success: true,
            spin: { _id: "spin2", outcomeType: "discount30", decision: "pending" },
            tryAgainStatus: { tryAgainCount: 12, distanceToNextBenchmarks: { "50": 38, "100": 88 } },
          },
        });
      }
      return Promise.reject(new Error(`Unhandled POST ${url}`));
    });

    renderWidget(loggedInUser);
    const user = userEvent.setup();
    await user.click(await screen.findByTestId("spin-button"));

    expect(screen.getByTestId("try-again-benchmark-copy")).toHaveTextContent(
      "You're at 12 try-agains. 38 more unlocks the 20% guaranteed board, 88 more unlocks the 50% guaranteed board."
    );

    await user.click(screen.getByRole("button", { name: /continue trying/i }));

    await waitFor(() =>
      expect(screen.queryByTestId("spin-result-modal")).not.toBeInTheDocument()
    );
    expect(decisionCalls).toEqual([{ decision: "decline" }]);
  });
});
