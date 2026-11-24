"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import {
  deleteUserAction,
  resetPasswordAction,
  toggleUserActiveAction,
  type AdminState,
} from "@/app/actions/admin";
import { Alert, Button, Card, CardBody, CardHeader } from "@/components/ui";

function PendingButton({
  children,
  variant = "secondary",
  className,
}: {
  children: React.ReactNode;
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
      {pending ? "…" : children}
    </Button>
  );
}

export function DangerZone({
  userId,
  isActive,
  isSelf,
  fullName,
}: {
  userId: string;
  isActive: boolean;
  isSelf: boolean;
  fullName: string;
}) {
  const [resetState, resetAction] = useActionState<AdminState, FormData>(
    resetPasswordAction,
    {},
  );

  return (
    <Card>
      <CardHeader
        title="Gestion de l'accès"
        description="Actions réservées à l'administration."
      />
      <CardBody className="space-y-5">
        <div>
          <p className="mb-2 text-sm font-medium text-navy-800">
            Réinitialiser le mot de passe
          </p>
          {resetState.generatedPassword ? (
            <div className="space-y-2">
              <Alert tone="success">{resetState.success}</Alert>
              <p className="select-all rounded-md border border-navy-200 bg-navy-50 px-3 py-2 font-mono text-base tracking-wide text-navy-900">
                {resetState.generatedPassword}
              </p>
              <p className="text-xs text-navy-500">
                Transmettez-le maintenant : il ne sera plus affiché.
              </p>
            </div>
          ) : (
            <form action={resetAction}>
              <input type="hidden" name="userId" value={userId} />
              {resetState.error ? (
                <div className="mb-2">
                  <Alert tone="danger">{resetState.error}</Alert>
                </div>
              ) : null}
              <PendingButton className="w-full">
                Générer un nouveau mot de passe
              </PendingButton>
            </form>
          )}
        </div>

        <div className="border-t border-navy-100 pt-5">
          <p className="mb-2 text-sm font-medium text-navy-800">
            {isActive ? "Suspendre l'accès" : "Réactiver l'accès"}
          </p>
          <p className="mb-2 text-xs leading-relaxed text-navy-500">
            {isActive
              ? "La personne ne pourra plus se connecter, mais ses données sont conservées."
              : "La personne pourra de nouveau se connecter."}
          </p>
          <form action={toggleUserActiveAction}>
            <input type="hidden" name="userId" value={userId} />
            <PendingButton
              variant={isActive ? "danger" : "primary"}
              className="w-full"
            >
              {isActive ? "Suspendre le compte" : "Réactiver le compte"}
            </PendingButton>
          </form>
          {isSelf ? (
            <p className="mt-2 text-xs text-navy-400">
              Action indisponible sur votre propre compte.
            </p>
          ) : null}
        </div>

        {!isSelf ? (
          <div className="border-t border-navy-100 pt-5">
            <p className="mb-2 text-sm font-medium text-red-700">
              Supprimer définitivement
            </p>
            <p className="mb-2 text-xs leading-relaxed text-navy-500">
              Supprime le compte de {fullName} ainsi que ses cours, rendus et
              notes. Cette action est irréversible.
            </p>
            <form
              action={deleteUserAction}
              onSubmit={(e) => {
                if (
                  !window.confirm(
                    `Supprimer définitivement le compte de ${fullName} ? Toutes ses données seront perdues.`,
                  )
                ) {
                  e.preventDefault();
                }
              }}
            >
              <input type="hidden" name="userId" value={userId} />
              <PendingButton variant="danger" className="w-full">
                Supprimer le compte
              </PendingButton>
            </form>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
