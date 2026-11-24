"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";

import { createUserAction, type AdminState } from "@/app/actions/admin";
import { Alert, Button, Field, Input, Select } from "@/components/ui";
import { ROLES } from "@/lib/constants";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Création…" : "Créer l'accès"}
    </Button>
  );
}

export function NewUserForm({
  programs,
}: {
  programs: { id: string; name: string }[];
}) {
  const [state, formAction] = useActionState<AdminState, FormData>(
    createUserAction,
    {},
  );
  const [role, setRole] = useState<string>(ROLES.STUDENT);

  // Après une création réussie, on montre le mot de passe à transmettre.
  if (state.generatedPassword) {
    return (
      <div className="space-y-4">
        <Alert tone="success">{state.success}</Alert>

        <div className="rounded-lg border border-navy-200 bg-navy-50 p-4">
          <p className="text-sm font-medium text-navy-800">
            Mot de passe provisoire
          </p>
          <p className="mt-2 select-all rounded-md border border-navy-200 bg-white px-3 py-2 font-mono text-lg tracking-wide text-navy-900">
            {state.generatedPassword}
          </p>
          <p className="mt-2 text-xs leading-relaxed text-navy-500">
            Notez-le maintenant : il ne sera plus affiché. La personne devra le
            changer dès sa première connexion.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/users"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-navy-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-900"
          >
            Retour à la liste
          </Link>
          <Link
            href="/admin/users/new"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-800 transition-colors hover:bg-navy-50"
          >
            Créer un autre accès
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? <Alert tone="danger">{state.error}</Alert> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" required>
          <Input name="firstName" required placeholder="Aminata" />
        </Field>
        <Field label="Nom" required>
          <Input name="lastName" required placeholder="Sarr" />
        </Field>
      </div>

      <Field label="Adresse e-mail" required>
        <Input
          name="email"
          type="email"
          required
          placeholder="prenom.nom@sbsclass.sn"
        />
      </Field>

      <Field label="Rôle" required>
        <Select
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          required
        >
          <option value={ROLES.STUDENT}>Élève</option>
          <option value={ROLES.TEACHER}>Professeur</option>
          <option value={ROLES.ADMIN}>Administrateur</option>
        </Select>
      </Field>

      {role === ROLES.STUDENT ? (
        <Field
          label="Cycle de rattachement"
          hint="Facultatif — vous pourrez l'inscrire plus tard depuis sa fiche."
        >
          <Select name="programId" defaultValue="">
            <option value="">Aucun pour le moment</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
