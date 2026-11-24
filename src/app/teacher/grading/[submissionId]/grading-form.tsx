"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  gradeSubmissionAction,
  type TeacherState,
} from "@/app/actions/teacher";
import { Alert, Badge, Button, Field, Textarea } from "@/components/ui";
import { QUESTION_TYPES, QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/constants";

type AnswerRow = {
  id: string;
  type: string;
  prompt: string;
  options: string[];
  correctAnswer: string | null;
  maxPoints: number;
  value: string;
  isCorrect: boolean | null;
  pointsAwarded: number;
};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enregistrement…" : "Valider la correction"}
    </Button>
  );
}

/** Affiche la réponse de l'élève sous une forme lisible. */
function displayAnswer(a: AnswerRow): string {
  if (a.type === QUESTION_TYPES.YES_NO) {
    if (a.value === "true") return "Oui";
    if (a.value === "false") return "Non";
    return "Sans réponse";
  }
  if (a.type === QUESTION_TYPES.MCQ) {
    const i = Number(a.value);
    return a.options[i] ?? "Sans réponse";
  }
  return a.value || "Sans réponse";
}

export function GradingForm({
  submissionId,
  answers,
  feedback,
}: {
  submissionId: string;
  answers: AnswerRow[];
  feedback: string | null;
}) {
  const [state, formAction] = useActionState<TeacherState, FormData>(
    gradeSubmissionAction,
    {},
  );

  const textAnswers = answers.filter((a) => a.type === QUESTION_TYPES.TEXT);
  const [manual, setManual] = useState<Record<string, number>>(
    Object.fromEntries(textAnswers.map((a) => [a.id, a.pointsAwarded])),
  );

  const autoScore = answers
    .filter((a) => a.type !== QUESTION_TYPES.TEXT)
    .reduce((s, a) => s + a.pointsAwarded, 0);
  const manualScore = Object.values(manual).reduce((s, v) => s + (v || 0), 0);
  const maxScore = answers.reduce((s, a) => s + a.maxPoints, 0);
  const total = autoScore + manualScore;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="submissionId" value={submissionId} />

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <ol className="space-y-4">
        {answers.map((a, i) => {
          const isText = a.type === QUESTION_TYPES.TEXT;
          return (
            <li
              key={a.id}
              className="rounded-lg border border-navy-100 bg-white p-4"
            >
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-navy-400">
                  Q{i + 1}
                </span>
                <Badge tone={isText ? "warning" : "neutral"}>
                  {QUESTION_TYPE_LABELS[a.type as QuestionType]}
                </Badge>
                {!isText ? (
                  a.isCorrect ? (
                    <Badge tone="success">Correct</Badge>
                  ) : (
                    <Badge tone="danger">Incorrect</Badge>
                  )
                ) : null}
                <span className="ml-auto text-xs text-navy-500">
                  {isText ? `/ ${a.maxPoints} pts` : `${a.pointsAwarded} / ${a.maxPoints} pts`}
                </span>
              </div>

              <p className="text-sm font-medium text-navy-900">{a.prompt}</p>

              <div className="mt-2 rounded-md border border-navy-100 bg-navy-50/60 px-3 py-2">
                <p className="text-xs font-medium text-navy-400">
                  Réponse de l&apos;élève
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-sm text-navy-800">
                  {displayAnswer(a)}
                </p>
              </div>

              {isText ? (
                <div className="mt-3 flex items-center gap-3">
                  <label className="text-sm font-medium text-navy-800">
                    Points attribués
                  </label>
                  <input
                    type="number"
                    name={`points_${a.id}`}
                    min={0}
                    max={a.maxPoints}
                    step={0.5}
                    value={manual[a.id] ?? 0}
                    onChange={(e) =>
                      setManual((m) => ({
                        ...m,
                        [a.id]: Math.max(
                          0,
                          Math.min(a.maxPoints, Number(e.target.value) || 0),
                        ),
                      }))
                    }
                    className="w-24 rounded-lg border border-navy-200 bg-white px-3 py-1.5 text-sm tabular-nums text-navy-900 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
                  />
                  <span className="text-sm text-navy-400">
                    sur {a.maxPoints}
                  </span>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="rounded-lg border border-navy-200 bg-navy-50 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-navy-800">
            Note de la copie
          </span>
          <span className="text-lg font-semibold tabular-nums text-navy-900">
            {total} / {maxScore}
            <span className="ml-2 text-sm font-normal text-navy-500">
              ({maxScore > 0 ? ((total / maxScore) * 20).toFixed(2) : "—"}/20)
            </span>
          </span>
        </div>
      </div>

      <Field label="Appréciation (facultatif)">
        <Textarea
          name="feedback"
          rows={3}
          defaultValue={feedback ?? ""}
          placeholder="Un commentaire pour l'élève…"
        />
      </Field>

      <SubmitButton />
    </form>
  );
}
