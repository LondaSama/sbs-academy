"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  submitExamAction,
  submitExerciseAction,
  type StudentState,
} from "@/app/actions/student";
import { Alert, Button, Textarea } from "@/components/ui";
import { QUESTION_TYPES } from "@/lib/constants";

export type AnswerableQuestion = {
  id: string;
  type: string;
  prompt: string;
  options: string[];
  points: number;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Envoi…" : label}
    </Button>
  );
}

export function AnswerForm({
  questions,
  exerciseId,
  examId,
  submitLabel,
}: {
  questions: AnswerableQuestion[];
  exerciseId?: string;
  examId?: string;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState<StudentState, FormData>(
    exerciseId ? submitExerciseAction : submitExamAction,
    {},
  );

  const total = questions.reduce((s, q) => s + q.points, 0);

  return (
    <form
      action={formAction}
      className="space-y-5"
      onSubmit={(e) => {
        if (
          !window.confirm(
            "Envoyer définitivement vos réponses ? Vous ne pourrez plus les modifier.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      {exerciseId ? (
        <input type="hidden" name="exerciseId" value={exerciseId} />
      ) : null}
      {examId ? <input type="hidden" name="examId" value={examId} /> : null}

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <p className="text-sm text-navy-500">
        {questions.length} question{questions.length > 1 ? "s" : ""} ·{" "}
        {total} point{total > 1 ? "s" : ""} au total
      </p>

      <ol className="space-y-5">
        {questions.map((q, i) => (
          <li
            key={q.id}
            className="rounded-lg border border-navy-100 bg-white p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-navy-900">
                <span className="mr-1.5 text-navy-400">{i + 1}.</span>
                {q.prompt}
              </p>
              <span className="shrink-0 text-xs text-navy-400">
                {q.points} pt{q.points > 1 ? "s" : ""}
              </span>
            </div>

            {q.type === QUESTION_TYPES.YES_NO ? (
              <div className="flex gap-4">
                {[
                  { value: "true", label: "Oui" },
                  { value: "false", label: "Non" },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-navy-200 px-4 py-2 text-sm text-navy-800 transition-colors hover:bg-navy-50 has-[:checked]:border-navy-700 has-[:checked]:bg-navy-50"
                  >
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      value={opt.value}
                      required
                      className="h-4 w-4 accent-navy-700"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            ) : null}

            {q.type === QUESTION_TYPES.MCQ ? (
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <label
                    key={oi}
                    className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-navy-200 px-3.5 py-2.5 text-sm text-navy-800 transition-colors hover:bg-navy-50 has-[:checked]:border-navy-700 has-[:checked]:bg-navy-50"
                  >
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      value={String(oi)}
                      required
                      className="mt-0.5 h-4 w-4 shrink-0 accent-navy-700"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ) : null}

            {q.type === QUESTION_TYPES.TEXT ? (
              <>
                <Textarea
                  name={`q_${q.id}`}
                  rows={6}
                  required
                  placeholder="Rédigez votre réponse…"
                />
                <p className="mt-1.5 text-xs text-navy-400">
                  Cette réponse sera corrigée par votre professeur.
                </p>
              </>
            ) : null}
          </li>
        ))}
      </ol>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Une fois envoyées, vos réponses ne peuvent plus être modifiées.
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
