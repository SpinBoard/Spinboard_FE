import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createStore, Provider } from "jotai";
import { userAtom } from "@/atom/user";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => "/user/wallet",
}));

let bankAccounts: { _id: string; accountName: string; bankName: string; accountNumber: string }[] = [
  { _id: "b1", accountName: "Jane Doe", bankName: "GTBank", accountNumber: "0123456789" },
];

vi.mock("axios", () => {
  const instance = {
    get: vi.fn((url: string) => {
      if (url.includes("/wallet/balance")) {
        return Promise.resolve({
          data: { balance: 850, currency: "NGN", payoutThreshold: 1500, amountToThreshold: 650, nextPayoutDate: "2026-08-15T00:00:00.000Z" },
        });
      }
      if (url.includes("/wallet/transactions")) {
        return Promise.resolve({ data: { success: true, transactions: [] } });
      }
      if (url.includes("/wallet/bank-accounts")) {
        return Promise.resolve({ data: { success: true, bankAccounts } });
      }
      return Promise.reject(new Error(`Unhandled GET ${url}`));
    }),
    post: vi.fn((url: string, body: { bankName: string; accountNumber: string }) => {
      if (url.includes("/wallet/bank-accounts")) {
        const newAccount = {
          _id: "b2",
          accountName: "Resolved Name",
          bankName: body.bankName,
          accountNumber: body.accountNumber,
        };
        bankAccounts = [...bankAccounts, newAccount];
        return Promise.resolve({ data: { bankAccount: newAccount } });
      }
      return Promise.reject(new Error(`Unhandled POST ${url}`));
    }),
    delete: vi.fn(() => Promise.resolve({ data: { success: true } })),
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
  };
  return { default: { ...instance, create: () => instance } };
});

import WalletPage from "./page";

function renderPage() {
  const store = createStore();
  store.set(userAtom, {
    id: "user1",
    fullName: "Test User",
    email: "user@test.com",
    userType: "gamer" as const,
    isVerified: true,
    createdAt: "2026-01-01",
    accessToken: "test-token",
    refreshToken: "test-refresh",
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <WalletPage />
      </QueryClientProvider>
    </Provider>
  );
}

describe("WalletPage", () => {
  beforeEach(() => {
    bankAccounts = [
      { _id: "b1", accountName: "Jane Doe", bankName: "GTBank", accountNumber: "0123456789" },
    ];
  });

  it("shows the wallet balance", async () => {
    renderPage();
    expect(await screen.findByTestId("wallet-balance")).toHaveTextContent("₦850");
  });

  it("shows payout progress toward the threshold, with no withdraw action anywhere", async () => {
    renderPage();
    await screen.findByTestId("payout-progress");
    expect(screen.getByText(/₦650 to next payout/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /withdraw/i })).not.toBeInTheDocument();
  });

  it("shows the resolved account name after adding a bank account", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByTestId("wallet-balance");

    await user.type(screen.getByPlaceholderText("Account number"), "9988776655");
    await user.type(screen.getByPlaceholderText("Bank name"), "Zenith Bank");
    await user.type(screen.getByPlaceholderText("Bank code"), "057");
    await user.click(screen.getByRole("button", { name: /add bank account/i }));

    expect(
      await screen.findByText(/resolved account name: resolved name/i)
    ).toBeInTheDocument();
  });
});
