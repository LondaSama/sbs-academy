import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { HOME_BY_ROLE } from "@/lib/constants";
import { LoginForm } from "./login-form";

// La page lit la session (cookies) : rendu dynamique, pas de prérendu.
export const instant = false;

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.mustChangePassword ? "/change-password" : HOME_BY_ROLE[user.role]);
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="grid h-16 w-16 place-items-center rounded-2xl bg-navy-900 text-lg font-bold text-gold-400 shadow-lg">
            SBS
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-navy-900">
            SBS Academy
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            Sport Business School — Plateforme e-learning
          </p>
        </div>

        <div className="rounded-xl border border-navy-100 bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-base font-semibold text-navy-900">
            Connexion
          </h2>
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-navy-400">
          Les accès sont créés par l&apos;administration.
          <br />
          En cas de problème de connexion, contactez le secrétariat.
        </p>
      </div>
    </div>
  );
}
