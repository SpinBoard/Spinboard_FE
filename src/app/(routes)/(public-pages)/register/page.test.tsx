import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createStore, Provider } from "jotai";
import { userAtom } from "@/atom/user";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams(""),
  usePathname: () => "/register",
}));

vi.mock("@react-oauth/google", () => ({
  useGoogleLogin: () => () => {},
}));

const axiosPost = vi.fn();
vi.mock("axios", () => {
  const instance = {
    get: vi.fn(() => Promise.reject(new Error("unhandled GET"))),
    post: (...args: unknown[]) => axiosPost(...args),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
  return {
    default: { ...instance, create: () => instance },
    isAxiosError: () => false,
  };
});

import RegisterPage from "./page";

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const store = createStore();
  store.set(userAtom, null);
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <RegisterPage />
      </QueryClientProvider>
    </Provider>
  );
}

describe("RegisterPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    axiosPost.mockReset();
    axiosPost.mockResolvedValue({ data: { activationToken: "tok123" } });
  });

  it("only asks for username, email, and password — no first/last name", async () => {
    renderPage();
    expect(await screen.findByPlaceholderText("Username")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Email address")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Password")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/first name/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/last name/i)).not.toBeInTheDocument();
  });

  it("submits exactly { username, email, password } to the gamer register endpoint", async () => {
    renderPage();
    const user = userEvent.setup();
    await user.type(await screen.findByPlaceholderText("Username"), "player_one");
    await user.type(screen.getByPlaceholderText("Email address"), "player@test.com");
    await user.type(screen.getByPlaceholderText("Password"), "password123");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(axiosPost).toHaveBeenCalledWith(
      expect.stringContaining("/auth/gamer/register"),
      { username: "player_one", email: "player@test.com", password: "password123" }
    );
  });
});
