"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  addQuestionAction,
  deleteQuestionAction,
  type TeacherState,
} from "@/app/actions/teacher";
import {
  Alert,
  Badge,
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import {
  QUESTION_TYPES,
  QUESTION_TYPE_LABELS,
  type QuestionType,
} from "@/lib/constants";

export type EditableQuestion = {
  id: string;
  type: string;
  prompt: string;
  options: string[];
  correctAnswer: string | null;
  points: number;
  position: number;
};

function AddButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Ajout…" : "Ajouter la question"}
    </Button>
  );
}

function DeleteQuestionButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-medium text-red-600 transition-colors hover:text-red-800 disabled:opacity-50"
    >
      {pending ? "…" : "Supprimer"}
    </button>
  );
}

/** Rend lisible la bonne réponse enregistrée pour une question. */
function describeAnswer(q: EditableQuestion): string {
  if (q.type === QUESTION_TYPES.TEXT) return "Correction manuelle";
  if (q.type === QUESTION_TYPES.YES_NO) {
    return q.correctAnswer === "true" ? "Oui" : "Non";
  }
  const index = Number(q.correctAnswer);
  return q.options[index] ?? "—";
}

export function QuestionEditor({
  questions,
  exerciseId,
  examId,
}: {
  questions: EditableQuestion[];
  exerciseId?: string;
  examId?: string;
}) {
  const [state, formAction] = useActionState<TeacherState, FormData>(
    addQuestionAction,
    {},
  );
  const [type, setType] = useState<QuestionType>(QUESTION_TYPES.MCQ);
  const [optionCount, setOptionCount] = useState(3);

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="space-y-6">
      {/* ------------------------------------------- Questions existantes */}
      {questions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-4 py-6 text-center">
          <p className="text-sm font-medium text-amber-900">
            Aucune question pour le moment
          </p>
          <p className="mt-1 text-xs text-amber-800">
            Au moins une question est nécessaire pour publier.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-navy-800">
              {questions.length} question{questions.length > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-navy-500">
              Barème total :{" "}
              <span className="font-semibold text-navy-900">
                {totalPoints} point{totalPoints > 1 ? "s" : ""}
              </span>
            </p>
          </div>

          <ol className="space-y-3">
            {questions.map((q, i) => (
              <li
                key={q.id}
                className="rounded-lg border border-navy-100 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-xs font-semibold text-navy-400">
                        Q{i + 1}
                      </span>
                      <Badge
                        tone={
                          q.type === QUESTION_TYPES.TEXT ? "warning" : "neutral"
                        }
                      >
                        {QUESTION_TYPE_LABELS[q.type as QuestionType]}
                      </Badge>
                      <span className="text-xs text-navy-500">
                        {q.points} pt{q.points > 1 ? "s" : ""}
                      </span>
                    </div>

                    <p className="text-sm text-navy-900">{q.prompt}</p>

                    {q.type === QUESTION_TYPES.MCQ && q.options.length > 0 ? (
                      <ul className="mt-2 space-y-1">
                        {q.options.map((opt, oi) => (
                          <li
                            key={oi}
                            className={[
                              "text-xs",
                              String(oi) === q.correctAnswer
                                ? "font-medium text-emerald-700"
                                : "text-navy-500",
                            ].join(" ")}
                          >
                            {String(oi) === q.correctAnswer ? "✓" : "•"} {opt}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1.5 text-xs text-navy-500">
                        Réponse attendue :{" "}
                        <span className="font-medium text-navy-700">
                          {describeAnswer(q)}
                        </span>
                      </p>
                    )}
                  </div>

                  <form action={deleteQuestionAction} className="shrink-0">
                    <input type="hidden" name="questionId" value={q.id} />
                    <DeleteQuestionButton />
                  </form>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* --------------------------------------------- Nouvelle question */}
      <form
        action={formAction}
        className="space-y-4 rounded-lg border border-navy-200 bg-navy-50/50 p-4"
      >
        {exerciseId ? (
          <input type="hidden" name="exerciseId" value={exerciseId} />
        ) : null}
        {examId ? <input type="hidden" name="examId" value={examId} /> : null}

        <p className="text-sm font-semibold text-navy-900">
          Ajouter une question
        </p>

        {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
        {state.success ? <Alert tone="success">{state.success}</Alert> : null}

        <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
          <Field label="Type de réponse" required>
            <Select
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as QuestionType)}
            >
              <option value={QUESTION_TYPES.MCQ}>Choix multiple</option>
              <option value={QUESTION_TYPES.YES_NO}>Oui / Non</option>
              <option value={QUESTION_TYPES.TEXT}>Réponse rédigée</option>
            </Select>
          </Field>

          <Field label="Barème" required>
            <Input
              name="points"
              type="number"
              min={1}
              max={50}
              defaultValue={type === QUESTION_TYPES.TEXT ? 5 : 2}
              key={type}
              required
              className="w-24"
            />
          </Field>
        </div>

        <Field label="Énoncé" required>
          <Textarea
            name="prompt"
            rows={2}
            required
            placeholder="Posez votre question…"
          />
        </Field>

        {type === QUESTION_TYPES.MCQ ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-navy-800">
              Propositions
              <span className="ml-0.5 text-red-600">*</span>
            </p>
            {Array.from({ length: optionCount }).map((_, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="correctAnswer"
                  value={String(i)}
                  defaultChecked={i === 0}
                  className="h-4 w-4 shrink-0 accent-navy-700"
                  aria-label={`Proposition ${i + 1} correcte`}
                />
                <Input
                  name="options"
                  placeholder={`Proposition ${i + 1}`}
                  required={i < 2}
                />
              </div>
            ))}
            <div className="flex gap-3 pt-1">
              {optionCount < 6 ? (
                <button
                  type="button"
                  onClick={() => setOptionCount((c) => c + 1)}
                  className="text-xs font-medium text-navy-600 hover:text-navy-900"
                >
                  + Ajouter une proposition
                </button>
              ) : null}
              {optionCount > 2 ? (
                <button
                  type="button"
                  onClick={() => setOptionCount((c) => c - 1)}
                  className="text-xs font-medium text-navy-500 hover:text-navy-800"
                >
                  − Retirer la dernière
                </button>
              ) : null}
            </div>
            <p className="text-xs text-navy-400">
              Cochez le bouton radio devant la bonne réponse.
            </p>
          </div>
        ) : null}

        {type === QUESTION_TYPES.YES_NO ? (
          <Field label="Bonne réponse" required>
            <Select name="correctAnswer" defaultValue="true">
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </Select>
          </Field>
        ) : null}

        {type === QUESTION_TYPES.TEXT ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Les réponses rédigées ne peuvent pas être corrigées
            automatiquement : vous attribuerez les points depuis l&apos;onglet
            « Corrections ».
          </p>
        ) : null}

        <AddButton />
      </form>
    </div>
  );
}
