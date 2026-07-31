"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdQuestion } from "@/types";

interface QuizPanelProps {
  questions: AdQuestion[];
  onSubmit: (answers: number[]) => void;
  submitting: boolean;
  // `allCorrect` is the ONLY feedback the API returns (see
  // API_CONTRACT_ADS_REWARD_PLATFORM.md §3 — "no per-question feedback is
  // ever returned"), so this panel can never highlight which answers were
  // wrong. Retries are unlimited.
  lastResult: { allCorrect: boolean } | null;
  campaignKey: string; // reset selections when the ad changes
}

export function QuizPanel({
  questions,
  onSubmit,
  submitting,
  lastResult,
  campaignKey,
}: QuizPanelProps) {
  const [answers, setAnswers] = useState<(number | null)[]>(() =>
    questions.map(() => null)
  );

  useEffect(() => {
    setAnswers(questions.map(() => null));
  }, [campaignKey, questions]);

  const allAnswered = answers.every((a) => a !== null);

  const handleSelect = (qIndex: number, choiceIndex: number) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = choiceIndex;
      return next;
    });
  };

  const handleSubmit = () => {
    if (!allAnswered) return;
    onSubmit(answers as number[]);
  };

  return (
    <div className="space-y-4" data-testid="quiz-panel">
      <div>
        <h3 className="font-sora text-xl font-bold text-foreground">Quick quiz</h3>
        <p className="text-sm text-muted-foreground">
          Answer all {questions.length} questions, then submit together. Unlimited
          retries.
        </p>
      </div>

      {lastResult && !lastResult.allCorrect && (
        <div
          role="alert"
          className="p-3 bg-destructive/10 border border-destructive/40 rounded-lg flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
          <p className="text-destructive text-sm">
            One or more answers were wrong. Rewatch if you need to, then try again —
            retries are unlimited.
          </p>
        </div>
      )}

      {questions.map((q, qIndex) => (
        <div
          key={qIndex}
          data-testid={`quiz-question-${qIndex}`}
          className="p-4 rounded-lg border border-border bg-card space-y-3">
          <h4 className="font-medium text-foreground">
            {qIndex + 1}. {q.question}
          </h4>
          <div className="grid grid-cols-1 gap-2">
            {q.choices.map((choice, cIndex) => (
              <button
                key={cIndex}
                type="button"
                data-testid={`quiz-choice-${qIndex}-${cIndex}`}
                onClick={() => handleSelect(qIndex, cIndex)}
                aria-pressed={answers[qIndex] === cIndex}
                className={`text-left px-4 py-2.5 rounded-lg border transition-colors text-sm ${
                  answers[qIndex] === cIndex
                    ? "bg-primary/15 border-primary text-foreground"
                    : "bg-white/5 border-border text-muted-foreground hover:bg-white/10"
                }`}>
                <span className="font-medium mr-2">
                  {String.fromCharCode(65 + cIndex)}.
                </span>
                {choice}
              </button>
            ))}
          </div>
        </div>
      ))}

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={!allAnswered || submitting}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
        {submitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Checking...
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Submit answers
          </>
        )}
      </Button>
    </div>
  );
}
