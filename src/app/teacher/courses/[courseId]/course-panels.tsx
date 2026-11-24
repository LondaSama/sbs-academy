"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createChapterAction,
  createExamAction,
  deleteCourseAction,
  toggleCoursePublishAction,
  type TeacherState,
} from "@/app/actions/teacher";
import { Alert, Button, Field, Input, Textarea } from "@/components/ui";

function SubmitButton({
  label,
  variant = "primary",
  className,
}: {
  label: string;
  variant?: "primary" | "secondary" | "danger";
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      disabled={pending}
      className={className}
    >
      {pending ? "…" : label}
    </Button>
  );
}

export function PublishCourse({
  courseId,
  isPublished,
}: {
  courseId: string;
  isPublished: boolean;
}) {
  const [state, formAction] = useActionState<TeacherState, FormData>(
    toggleCoursePublishAction,
    {},
  );

  return (
    <div className="space-y-3">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <p className="text-sm leading-relaxed text-navy-500">
        {isPublished
          ? "Ce cours est visible par les élèves du cycle."
          : "Ce cours est en brouillon. Pour le publier, chaque chapitre doit comporter un exercice avec au moins une question."}
      </p>

      <form action={formAction}>
        <input type="hidden" name="courseId" value={courseId} />
        <SubmitButton
          label={isPublished ? "Dépublier le cours" : "Publier le cours"}
          variant={isPublished ? "secondary" : "primary"}
          className="w-full"
        />
      </form>
    </div>
  );
}

export function NewChapterForm({ courseId }: { courseId: string }) {
  const [state, formAction] = useActionState<TeacherState, FormData>(
    createChapterAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <p className="text-sm font-medium text-navy-800">Ajouter un chapitre</p>

      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            name="title"
            required
            placeholder="Titre du chapitre (ex. Le sponsoring sportif)"
          />
        </div>
        <SubmitButton label="Ajouter" />
      </div>

      <p className="text-xs text-navy-400">
        Un exercice de fin de chapitre sera créé automatiquement : vous n&apos;aurez
        plus qu&apos;à y ajouter vos questions.
      </p>
    </form>
  );
}

export function NewExamForm({ courseId }: { courseId: string }) {
  const [state, formAction] = useActionState<TeacherState, FormData>(
    createExamAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="courseId" value={courseId} />
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <p className="text-sm font-medium text-navy-800">Ajouter un examen</p>

      <Field label="Titre">
        <Input
          name="title"
          required
          placeholder="Examen de mi-parcours"
        />
      </Field>

      <Field label="Consignes">
        <Textarea
          name="instructions"
          rows={2}
          placeholder="Durée, documents autorisés…"
        />
      </Field>

      <SubmitButton label="Créer l'examen" />
    </form>
  );
}

export function DeleteCourse({
  courseId,
  title,
}: {
  courseId: string;
  title: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs leading-relaxed text-navy-500">
        Supprime le cours, ses chapitres, ses exercices, ses examens et toutes
        les notes associées. Cette action est irréversible.
      </p>
      <form
        action={deleteCourseAction}
        onSubmit={(e) => {
          if (
            !window.confirm(
              `Supprimer définitivement le cours « ${title} » et toutes les notes associées ?`,
            )
          ) {
            e.preventDefault();
          }
        }}
      >
        <input type="hidden" name="courseId" value={courseId} />
        <SubmitButton label="Supprimer le cours" variant="danger" className="w-full" />
      </form>
    </div>
  );
}
