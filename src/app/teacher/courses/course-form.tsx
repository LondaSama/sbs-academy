"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createCourseAction,
  updateCourseAction,
  type TeacherState,
} from "@/app/actions/teacher";
import { Alert, Button, Field, Input, Select, Textarea } from "@/components/ui";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enregistrement…" : label}
    </Button>
  );
}

export function CourseForm({
  programs,
  mode,
  course,
}: {
  programs: { id: string; name: string }[];
  mode: "create" | "edit";
  course?: {
    id: string;
    title: string;
    description: string | null;
    programId: string;
  };
}) {
  const [state, formAction] = useActionState<TeacherState, FormData>(
    mode === "create" ? createCourseAction : updateCourseAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      {course ? <input type="hidden" name="courseId" value={course.id} /> : null}

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <Field label="Titre du cours" required>
        <Input
          name="title"
          defaultValue={course?.title}
          required
          placeholder="Marketing sportif"
        />
      </Field>

      <Field label="Description">
        <Textarea
          name="description"
          rows={3}
          defaultValue={course?.description ?? ""}
          placeholder="Ce que les élèves vont apprendre…"
        />
      </Field>

      <Field label="Cycle" required>
        <Select name="programId" defaultValue={course?.programId} required>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </Select>
      </Field>

      <div className="pt-2">
        <SubmitButton
          label={mode === "create" ? "Créer le cours" : "Enregistrer"}
        />
      </div>
    </form>
  );
}
