"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import {
  createSession,
  destroySession,
  hashPassword,
  requireUser,
  verifyPassword,
} from "@/lib/auth";
import { HOME_BY_ROLE, type Role } from "@/lib/constants";

export type ActionState = { error?: string; success?: string };

const loginSchema = z.object({
  email: z.string().trim().min(1, "L'adresse e-mail est obligatoire."),
  password: z.string().min(1, "Le mot de passe est obligatoire."),
});

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });

  // Message volontairement identique dans tous les cas d'échec :
  // on n'indique jamais si l'adresse existe.
  const genericError = "Identifiants incorrects.";

  if (!user) return { error: genericError };

  const ok = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!ok) return { error: genericError };

  if (!user.isActive) {
    return {
      error:
        "Ce compte est désactivé. Contactez l'administration de SBS Academy.",
    };
  }

  await createSession(user.id);

  redirect(
    user.mustChangePassword
      ? "/change-password"
      : HOME_BY_ROLE[user.role as Role],
  );
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  redirect("/login");
}

const passwordSchema = z
  .string()
  .min(8, "Le mot de passe doit contenir au moins 8 caractères.");

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser();

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  const parsed = passwordSchema.safeParse(next);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (next !== confirm) {
    return { error: "Les deux mots de passe ne correspondent pas." };
  }

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!record) return { error: "Compte introuvable." };

  const ok = await verifyPassword(current, record.passwordHash);
  if (!ok) return { error: "Le mot de passe actuel est incorrect." };

  if (current === next) {
    return { error: "Le nouveau mot de passe doit être différent de l'ancien." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(next),
      mustChangePassword: false,
    },
  });

  redirect(HOME_BY_ROLE[user.role]);
}
