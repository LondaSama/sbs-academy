"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteExamAction,
  toggleExamPublishAction,
  updateExamAction,
  type TeacherState,
} from "@/app/actions/teacher";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Field,
  Input,
  Textarea,
} from "@/components/ui";

function SubmitButton({
  label,
  variant = "primary",
  className,
  disabled,
}: {
  label: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending || disabled}
      className={className}
    >
      {pending ? "…" : label}
    </Button>
  );
}

export function ExamForm({
  exam,
}: {
  exam: { id: string; title: string; instructions: string | null };
}) {
  const [state, formAction] = useActionState<TeacherState, FormData>(
    updateExamAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="examId" value={exam.id} />

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <Field label="Titre" required>
        <Input name="title" defaultValue={exam.title} required />
      </Field>

      <Field label="Consignes">
        <Textarea
          name="instructions"
          rows={4}
          defaultValue={exam.instructions ?? ""}
          placeholder="Durée, documents autorisés…"
        />
      </Field>

      <SubmitButton label="Enregistrer" />
    </form>
  );
}

export function ExamSidebar({
  examId,
  title,
  isPublished,
  questionCount,
}: {
  examId: string;
  title: string;
  isPublished: boolean;
  questionCount: number;
}) {
  const canPublish = questionCount > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Visibilité" />
        <CardBody className="space-y-3">
          <p className="text-sm leading-relaxed text-navy-500">
            {isPublished
              ? "Cet examen est ouvert aux élèves du cycle."
              : canPublish
                ? "Publiez l'examen pour le rendre accessible aux élèves."
                : "Ajoutez au moins une question avant de publier."}
          </p>
          <form action={toggleExamPublishAction}>
            <input type="hidden" name="examId" value={examId} />
            <SubmitButton
              label={isPublished ? "Fermer l'examen" : "Publier l'examen"}
              variant={isPublished ? "secondary" : "primary"}
              className="w-full"
              disabled={!isPublished && !canPublish}
            />
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Supprimer" />
        <CardBody className="space-y-2">
          <p className="text-xs leading-relaxed text-navy-500">
            Supprime l&apos;examen, ses questions et les copies des élèves.
          </p>
          <form
            action={deleteExamAction}
            onSubmit={(e) => {
              if (
                !window.confirm(
                  `Supprimer l'examen « ${title} » et toutes les copies associées ?`,
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="examId" value={examId} />
            <SubmitButton
              label="Supprimer l'examen"
              variant="danger"
              className="w-full"
            />
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
