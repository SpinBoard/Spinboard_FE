import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { atom } from "jotai";

const pushMock = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock("@/atom/user", () => ({
  userAtom: atom({
    id: "brand1",
    fullName: "Test Brand",
    email: "brand@test.com",
    userType: "brand",
    isVerified: true,
    createdAt: "2026-01-01",
    accessToken: "test-token",
    refreshToken: "test-refresh",
  }),
}));

const hoisted = vi.hoisted(() => ({
  capturedFormData: null as FormData | null,
  paymentInitCalls: [] as unknown[],
}));

vi.mock("axios", () => {
  const get = vi.fn((url: string) => {
    if (url.includes("/admin/config")) {
      return Promise.reject({ response: { status: 403 } });
    }
    return Promise.reject(new Error(`Unhandled GET ${url}`));
  });

  const post = vi.fn((url: string, body: unknown) => {
    if (url.includes("/ad-campaigns")) {
      hoisted.capturedFormData = body as FormData;
      return Promise.resolve({
        data: { success: true, campaign: { _id: "camp1", tier: "basic" } },
      });
    }
    if (url.includes("/ad-payments/initialize")) {
      hoisted.paymentInitCalls.push(body);
      return Promise.resolve({
        data: { data: { authorization_url: "https://paystack.example/pay" } },
      });
    }
    return Promise.reject(new Error(`Unhandled POST ${url}`));
  });

  const interceptors = { request: { use: vi.fn() }, response: { use: vi.fn() } };
  const instance = { get, post, interceptors };
  return { default: { ...instance, create: () => instance } };
});

vi.mock("./wizard-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./wizard-utils")>();
  return {
    ...actual,
    getVideoDuration: vi.fn().mockResolvedValue(90),
  };
});

vi.stubGlobal("open", vi.fn());

import CreateCampaignWizardPage from "./page";

function renderWizard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateCampaignWizardPage />
    </QueryClientProvider>
  );
}

const makeFile = (name: string, type: string) => new File(["x".repeat(20)], name, { type });

async function fillQuizStep(user: ReturnType<typeof userEvent.setup>) {
  const questionInputs = screen.getAllByLabelText("Question");
  const choiceLabels = ["Choice A", "Choice B", "Choice C", "Choice D"];
  for (let q = 0; q < 3; q++) {
    await user.type(questionInputs[q], `Sample question number ${q + 1}?`);
    const group = questionInputs[q].closest("div.space-y-4") as HTMLElement;
    for (const label of choiceLabels) {
      const choiceInput = within(group).getByLabelText(label);
      await user.type(choiceInput, `${label} text`);
    }
  }
}

async function advanceThroughDetailsVideoQuiz(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Campaign Title"), "Summer Splash");
  await user.type(
    screen.getByLabelText("Description"),
    "A fun summer campaign for our brand fans"
  );
  await user.click(screen.getByRole("button", { name: /next/i }));

  await screen.findByRole("heading", { name: /ad video/i });
  const videoInput = screen.getByTestId("video-input");
  await user.upload(videoInput, makeFile("video.mp4", "video/mp4"));
  await screen.findByText(/looks good/i);
  await user.click(screen.getByRole("button", { name: /next/i }));

  await screen.findByRole("heading", { name: /quiz questions/i });
  await fillQuizStep(user);
  await user.click(screen.getByRole("button", { name: /next/i }));

  await screen.findByRole("heading", { name: /choose your tier/i });
}

describe("CreateCampaignWizardPage", () => {
  beforeEach(() => {
    pushMock.mockClear();
    hoisted.capturedFormData = null;
    hoisted.paymentInitCalls = [];
  });

  it("blocks advancing past step 0 until required fields are valid", async () => {
    const user = userEvent.setup();
    renderWizard();

    await user.click(screen.getByRole("button", { name: /next/i }));

    expect(screen.queryByRole("heading", { name: /ad video/i })).not.toBeInTheDocument();
    expect(await screen.findAllByText(/at least 3 characters|at least 10 characters/i)).not.toHaveLength(0);
  });

  it("shows the tier comparison with prices and benefit checkmarks", async () => {
    const user = userEvent.setup();
    renderWizard();
    await advanceThroughDetailsVideoQuiz(user);

    const basicCard = screen.getByTestId("tier-card-basic");
    const premiumCard = screen.getByTestId("tier-card-premium");
    const proCard = screen.getByTestId("tier-card-pro");

    expect(basicCard).toHaveTextContent("$20");
    expect(premiumCard).toHaveTextContent("$30");
    expect(proCard).toHaveTextContent("$50");
    expect(premiumCard).toHaveTextContent("2x display weight");
    expect(proCard).toHaveTextContent("3x display weight");
  }, 20000);

  it("only shows the global-visibility toggle for the Pro tier", async () => {
    const user = userEvent.setup();
    renderWizard();
    await advanceThroughDetailsVideoQuiz(user);

    expect(screen.queryByLabelText(/show globally/i)).not.toBeInTheDocument();

    await user.click(screen.getByTestId("tier-card-premium"));
    expect(screen.queryByLabelText(/show globally/i)).not.toBeInTheDocument();

    await user.click(screen.getByTestId("tier-card-pro"));
    expect(screen.getByLabelText(/show globally/i)).toBeInTheDocument();
  }, 20000);

  it("creates the campaign as a draft, then offers to pay now with the tier price", async () => {
    const user = userEvent.setup();
    renderWizard();
    await advanceThroughDetailsVideoQuiz(user);

    await user.click(screen.getByTestId("tier-card-premium"));
    await user.click(screen.getByRole("button", { name: /next/i }));

    await screen.findByRole("heading", { name: /^review$/i });
    expect(screen.getByText("$30")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /create campaign/i }));

    await user.click(await screen.findByRole("button", { name: /create draft/i }));

    const fd = await waitFor(() => {
      expect(hoisted.capturedFormData).not.toBeNull();
      return hoisted.capturedFormData!;
    });
    expect(fd.get("title")).toBe("Summer Splash");
    expect(fd.get("tier")).toBe("premium");
    expect(fd.has("global")).toBe(false);
    expect(JSON.parse(fd.get("questions") as string)).toHaveLength(3);

    await user.click(await screen.findByRole("button", { name: /pay now/i }));

    await waitFor(() =>
      expect(hoisted.paymentInitCalls).toEqual([{ campaignId: "camp1", email: "brand@test.com" }])
    );
    await waitFor(() => expect(pushMock).toHaveBeenCalledWith("/brand/campaigns"));
  }, 30000);
});
