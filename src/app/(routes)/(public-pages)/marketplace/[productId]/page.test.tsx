import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createStore, Provider } from "jotai";
import { userAtom } from "@/atom/user";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/marketplace/prod1",
  useParams: () => ({ productId: "prod1" }),
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

const product = {
  _id: "prod1",
  brandId: "brand1",
  name: "Premium eBook",
  description: "A great digital product",
  priceUSD: 25,
  category: "ebooks",
  createdAt: "2026-01-01",
};

const axiosPost = vi.fn();
vi.mock("axios", () => {
  const instance = {
    get: vi.fn((url: string) => {
      if (url.includes("/marketplace/products/prod1")) {
        return Promise.resolve({ data: { success: true, product } });
      }
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    }),
    post: (...args: unknown[]) => axiosPost(...args),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
  return {
    default: { ...instance, create: () => instance },
    isAxiosError: () => false,
  };
});

import ProductDetailPage from "./page";

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const store = createStore();
  store.set(userAtom, loggedInUser);
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ProductDetailPage />
      </QueryClientProvider>
    </Provider>
  );
}

describe("Marketplace product checkout", () => {
  beforeEach(() => {
    axiosPost.mockReset();
  });

  it("shows the product price and a discount code field", async () => {
    renderPage();
    expect(await screen.findByText("$25")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/spin20/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /checkout — \$25/i })).toBeInTheDocument();
  });

  it("submits the discount code and redirects to the Paystack authorization URL", async () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    axiosPost.mockResolvedValue({
      data: { success: true, reference: "ref123", authorizationUrl: "https://paystack.example/pay/ref123" },
    });

    renderPage();
    const user = userEvent.setup();
    await user.type(await screen.findByPlaceholderText(/spin20/i), "SAVE20");
    await user.click(screen.getByRole("button", { name: /checkout/i }));

    await waitFor(() =>
      expect(axiosPost).toHaveBeenCalledWith(
        expect.stringContaining("/marketplace/checkout"),
        { productId: "prod1", email: "user@test.com", discountCode: "SAVE20" }
      )
    );
    expect(openSpy).toHaveBeenCalledWith("https://paystack.example/pay/ref123", "_blank");
  });

  it("shows instant delivery when a 100%-off code skips payment", async () => {
    axiosPost.mockResolvedValue({
      data: { success: true, reference: "ref456", deliveredImmediately: true },
    });

    renderPage();
    const user = userEvent.setup();
    await user.type(await screen.findByPlaceholderText(/spin20/i), "FREE100");
    await user.click(screen.getByRole("button", { name: /checkout/i }));

    expect(await screen.findByText("Delivered!")).toBeInTheDocument();
  });
});
