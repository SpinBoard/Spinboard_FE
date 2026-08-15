import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
  name: "Oak Dining Table",
  description: "Seats 6, solid oak, hand-finished.",
  category: "furniture",
  images: ["https://cdn.example/oak-table.jpg"],
  priceLabel: "From ₦180,000",
  isActive: true,
  createdAt: "2026-01-01",
};

const business = {
  brandId: "brand1",
  businessName: "Craft Furniture Co.",
  category: ["furniture"],
  contactEmail: "sales@craft.example",
  contactPhone: "+2348033334444",
  whatsappNumber: "+2348033334444",
  socialLinks: { instagram: "https://instagram.com/craftfurnitureco" },
  isListed: true,
};

vi.mock("axios", () => {
  const instance = {
    get: vi.fn((url: string) => {
      if (url.includes("/marketplace/products/prod1")) {
        return Promise.resolve({ data: { success: true, product, business } });
      }
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    }),
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

describe("Marketplace product detail", () => {
  it("renders priceLabel as-is, with no checkout, discount code, or price paid in-app", async () => {
    renderPage();
    expect(await screen.findByText("From ₦180,000")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/spin20/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /checkout/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/delivered/i)).not.toBeInTheDocument();
  });

  it("shows the owning business's contact info as tappable links", async () => {
    renderPage();
    await screen.findByText("Craft Furniture Co.");
    expect(screen.getByRole("link", { name: /call/i })).toHaveAttribute("href", "tel:+2348033334444");
    expect(screen.getByRole("link", { name: /email/i })).toHaveAttribute("href", "mailto:sales@craft.example");
    expect(screen.getByRole("link", { name: /whatsapp/i })).toHaveAttribute(
      "href",
      "https://wa.me/2348033334444"
    );
  });
});
