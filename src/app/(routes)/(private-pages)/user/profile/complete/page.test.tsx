import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createStore, Provider } from "jotai";
import { userAtom } from "@/atom/user";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/user/profile/complete",
}));

const loggedInUser = {
  id: "user1",
  fullName: "Test User",
  email: "user@test.com",
  userType: "gamer" as const,
  isVerified: true,
  profileComplete: false,
  createdAt: "2026-01-01",
  accessToken: "test-token",
  refreshToken: "test-refresh",
};

const axiosPut = vi.fn();
vi.mock("axios", () => {
  const instance = {
    get: vi.fn(() => Promise.reject(new Error("unhandled GET"))),
    put: (...args: unknown[]) => axiosPut(...args),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
  return {
    default: { ...instance, create: () => instance },
    isAxiosError: () => false,
  };
});

import ProfileCompletePage from "./page";

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const store = createStore();
  store.set(userAtom, loggedInUser);
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ProfileCompletePage />
      </QueryClientProvider>
    </Provider>
  );
}

describe("ProfileCompletePage (gamer)", () => {
  beforeEach(() => {
    pushMock.mockClear();
    axiosPut.mockReset();
    axiosPut.mockResolvedValue({ data: { success: true } });
  });

  it("shows a 0-of-5 progress prompt before anything is filled", async () => {
    renderPage();
    expect(await screen.findByTestId("profile-progress-label")).toHaveTextContent(
      "0 of 5 fields complete"
    );
  });

  it("advances the progress prompt as fields are filled", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.type(await screen.findByPlaceholderText("Age"), "25");
    await user.type(screen.getByPlaceholderText("Country"), "Nigeria");

    await waitFor(() =>
      expect(screen.getByTestId("profile-progress-label")).toHaveTextContent(
        "2 of 5 fields complete"
      )
    );
  });

  it("blocks submission until every field is filled", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: /save & continue/i }));
    expect(axiosPut).not.toHaveBeenCalled();
  });

  it("saves the profile and redirects once complete", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.type(await screen.findByPlaceholderText("Age"), "25");
    await user.click(screen.getByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Prefer not to say" }));
    await user.type(screen.getByPlaceholderText("Country"), "Nigeria");
    await user.type(screen.getByPlaceholderText("State"), "Lagos");
    await user.type(screen.getByPlaceholderText("City"), "Ikeja");

    await user.click(screen.getByRole("button", { name: /save & continue/i }));

    await waitFor(() => expect(axiosPut).toHaveBeenCalled());
    expect(axiosPut).toHaveBeenCalledWith(
      expect.stringContaining("/profile/gamer"),
      expect.objectContaining({
        age: 25,
        sex: "prefer_not_to_say",
        country: "Nigeria",
        state: "Lagos",
        city: "Ikeja",
      })
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/watch"));
  });
});
