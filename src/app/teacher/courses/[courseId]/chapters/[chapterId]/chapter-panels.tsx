"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteChapterAction,
  toggleChapterPublishAction,
  updateChapterAction,
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

export function ChapterForm({
  chapter,
}: {
  chapter: { id: string; title: string; content: string };
}) {
  const [state, formAction] = useActionState<TeacherState, FormData>(
    updateChapterAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="chapterId" value={chapter.id} />

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <Field label="Titre du chapitre" required>
        <Input name="title" defaultValue={chapter.title} required />
      </Field>

      <Field label="Contenu">
        <Textarea
          name="content"
          rows={16}
          defaultValue={chapter.content}
          placeholder={"## Introduction\n\nVotre cours ici…\n\n- Point 1\n- Point 2"}
          className="font-mono text-[13px] leading-relaxed"
        />
      </Field>

      <SubmitButton label="Enregistrer le chapitre" />
    </form>
  );
}

export function ChapterSidebar({
  chapterId,
  title,
  isPublished,
  questionCount,
}: {
  chapterId: string;
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
              ? "Ce chapitre est visible par les élèves."
              : canPublish
                ? "Ce chapitre est en brouillon. Publiez-le pour que les élèves y accèdent."
                : "Ajoutez au moins une question à l'exercice avant de publier ce chapitre."}
          </p>
          <form action={toggleChapterPublishAction}>
            <input type="hidden" name="chapterId" value={chapterId} />
            <SubmitButton
              label={isPublished ? "Dépublier" : "Publier le chapitre"}
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
            Supprime le chapitre, son exercice et les rendus des élèves.
          </p>
          <form
            action={deleteChapterAction}
            onSubmit={(e) => {
              if (
                !window.confirm(
                  `Supprimer le chapitre « ${title} » et tous les rendus associés ?`,
                )
              ) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="chapterId" value={chapterId} />
            <SubmitButton
              label="Supprimer le chapitre"
              variant="danger"
              className="w-full"
            />
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
