import { requireUser } from "@/lib/auth";
import { ChangePasswordForm } from "./change-password-form";

export const instant = false;

export default async function ChangePasswordPage() {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-navy-900 text-sm font-bold text-gold-400 shadow-lg">
            SBS
          </span>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-navy-900">
            {user.mustChangePassword
              ? "Choisissez votre mot de passe"
              : "Changer de mot de passe"}
          </h1>
          {user.mustChangePassword ? (
            <p className="mt-1.5 text-sm text-navy-500">
              Pour votre sécurité, remplacez le mot de passe fourni par
              l&apos;administration avant d&apos;accéder à la plateforme.
            </p>
          ) : null}
        </div>

        <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
