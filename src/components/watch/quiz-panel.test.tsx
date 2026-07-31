import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuizPanel } from "./quiz-panel";
import { AdQuestion } from "@/types";

const questions: AdQuestion[] = [
  { question: "Q1?", choices: ["A", "B"] },
  { question: "Q2?", choices: ["C", "D"] },
  { question: "Q3?", choices: ["E", "F"] },
];

describe("QuizPanel", () => {
  it("keeps submit disabled until all 3 questions are answered", async () => {
    const onSubmit = vi.fn();
    render(
      <QuizPanel
        questions={questions}
        onSubmit={onSubmit}
        submitting={false}
        lastResult={null}
        campaignKey="camp1"
      />
    );

    const submit = screen.getByRole("button", { name: /submit answers/i });
    expect(submit).toBeDisabled();

    const user = userEvent.setup();
    await user.click(screen.getByTestId("quiz-choice-0-0"));
    expect(submit).toBeDisabled();
    await user.click(screen.getByTestId("quiz-choice-1-0"));
    expect(submit).toBeDisabled();
    await user.click(screen.getByTestId("quiz-choice-2-0"));
    expect(submit).toBeEnabled();
  });

  it("submits all 3 answers together, exactly once", async () => {
    const onSubmit = vi.fn();
    render(
      <QuizPanel
        questions={questions}
        onSubmit={onSubmit}
        submitting={false}
        lastResult={null}
        campaignKey="camp1"
      />
    );

    const user = userEvent.setup();
    await user.click(screen.getByTestId("quiz-choice-0-0"));
    await user.click(screen.getByTestId("quiz-choice-1-1"));
    await user.click(screen.getByTestId("quiz-choice-2-1"));
    await user.click(screen.getByRole("button", { name: /submit answers/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith([0, 1, 1]);
  });

  it("shows only a general wrong-answer banner, never per-question correctness", () => {
    render(
      <QuizPanel
        questions={questions}
        onSubmit={vi.fn()}
        submitting={false}
        lastResult={{ allCorrect: false }}
        campaignKey="camp1"
      />
    );

    expect(screen.getByRole("alert")).toHaveTextContent(/one or more answers were wrong/i);
    // no per-question indicator should ever be rendered — the API never
    // tells us which of the 3 were wrong.
    expect(screen.queryByText(/question 1 wrong/i)).not.toBeInTheDocument();
  });

  it("resets selections when the ad (campaignKey) changes", async () => {
    const { rerender } = render(
      <QuizPanel
        questions={questions}
        onSubmit={vi.fn()}
        submitting={false}
        lastResult={null}
        campaignKey="camp1"
      />
    );
    const user = userEvent.setup();
    await user.click(screen.getByTestId("quiz-choice-0-0"));
    await user.click(screen.getByTestId("quiz-choice-1-0"));
    await user.click(screen.getByTestId("quiz-choice-2-0"));
    expect(screen.getByRole("button", { name: /submit answers/i })).toBeEnabled();

    rerender(
      <QuizPanel
        questions={questions}
        onSubmit={vi.fn()}
        submitting={false}
        lastResult={null}
        campaignKey="camp2"
      />
    );
    expect(screen.getByRole("button", { name: /submit answers/i })).toBeDisabled();
  });
});
