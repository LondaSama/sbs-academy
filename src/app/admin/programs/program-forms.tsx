"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  createProgramAction,
  deleteProgramAction,
  type AdminState,
} from "@/app/actions/admin";
import {
  Alert,
  Button,
  Field,
  Input,
  Table,
  Td,
  Textarea,
  Th,
} from "@/components/ui";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Création…" : "Créer le cycle"}
    </Button>
  );
}

function DeleteButton() {
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

export function NewProgramForm() {
  const [state, formAction] = useActionState<AdminState, FormData>(
    createProgramAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <Field label="Nom du cycle" required>
        <Input
          name="name"
          required
          placeholder="Licence 2 — Sport Business"
        />
      </Field>

      <Field label="Description">
        <Textarea
          name="description"
          rows={3}
          placeholder="Deuxième année du cycle Licence…"
        />
      </Field>

      <SubmitButton />
    </form>
  );
}

export function ProgramList({
  programs,
}: {
  programs: {
    id: string;
    name: string;
    description: string | null;
    students: number;
    courses: number;
  }[];
}) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Cycle</Th>
          <Th>Élèves</Th>
          <Th>Cours</Th>
          <Th>{""}</Th>
        </tr>
      </thead>
      <tbody>
        {programs.map((p) => (
          <tr key={p.id}>
            <Td>
              <div className="font-medium text-navy-900">{p.name}</div>
              {p.description ? (
                <div className="mt-0.5 max-w-md text-xs text-navy-400">
                  {p.description}
                </div>
              ) : null}
            </Td>
            <Td className="tabular-nums">{p.students}</Td>
            <Td className="tabular-nums">{p.courses}</Td>
            <Td>
              <form
                action={deleteProgramAction}
                onSubmit={(e) => {
                  if (
                    !window.confirm(
                      `Supprimer le cycle « ${p.name} » ? Ses ${p.courses} cours et toutes les notes associées seront également supprimés.`,
                    )
                  ) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="programId" value={p.id} />
                <DeleteButton />
              </form>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
