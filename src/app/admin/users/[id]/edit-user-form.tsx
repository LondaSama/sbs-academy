"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { updateUserAction, type AdminState } from "@/app/actions/admin";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { ROLES, type Role } from "@/lib/constants";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Enregistrement…" : "Enregistrer"}
    </Button>
  );
}

export function EditUserForm({
  user,
  isSelf,
}: {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: Role;
  };
  isSelf: boolean;
}) {
  const [state, formAction] = useActionState<AdminState, FormData>(
    updateUserAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="userId" value={user.id} />

      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}
      {state.success ? <Alert tone="success">{state.success}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" required>
          <Input name="firstName" defaultValue={user.firstName} required />
        </Field>
        <Field label="Nom" required>
          <Input name="lastName" defaultValue={user.lastName} required />
        </Field>
      </div>

      <Field label="Adresse e-mail" required>
        <Input
          name="email"
          type="email"
          defaultValue={user.email}
          required
        />
      </Field>

      <Field
        label="Rôle"
        hint={
          isSelf
            ? "Vous ne pouvez pas modifier votre propre rôle d'administrateur."
            : undefined
        }
        required
      >
        <Select name="role" defaultValue={user.role} disabled={isSelf} required>
          <option value={ROLES.STUDENT}>Élève</option>
          <option value={ROLES.TEACHER}>Professeur</option>
          <option value={ROLES.ADMIN}>Administrateur</option>
        </Select>
        {isSelf ? (
          <input type="hidden" name="role" value={user.role} />
        ) : null}
      </Field>

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
