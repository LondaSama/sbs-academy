"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { hashPassword, requireAdmin } from "@/lib/auth";
import { ROLES } from "@/lib/constants";

export type AdminState = {
  error?: string;
  success?: string;
  /** Mot de passe généré, affiché une seule fois à l'administrateur. */
  generatedPassword?: string;
};

/** Mot de passe lisible, à transmettre à l'élève ou au professeur. */
function generatePassword(): string {
  const words = ["Dakar", "Sahel", "Teranga", "Baobab", "Goree", "Sine"];
  const word = words[Math.floor(Math.random() * words.length)];
  const digits = Math.floor(1000 + Math.random() * 9000);
  return `${word}${digits}!`;
}

/* ------------------------------------------------------------ Utilisateurs */

const userSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est obligatoire."),
  lastName: z.string().trim().min(1, "Le nom est obligatoire."),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide."),
  role: z.enum([ROLES.ADMIN, ROLES.TEACHER, ROLES.STUDENT]),
});

export async function createUserAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const parsed = userSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { error: "Un compte existe déjà avec cette adresse e-mail." };
  }

  const password = generatePassword();

  const user = await prisma.user.create({
    data: {
      ...parsed.data,
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
    },
  });

  // Inscription immédiate au cycle si un élève est créé depuis un cycle.
  const programId = String(formData.get("programId") ?? "");
  if (programId && parsed.data.role === ROLES.STUDENT) {
    await prisma.enrollment.create({
      data: { studentId: user.id, programId },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");

  return {
    success: `Compte créé pour ${user.firstName} ${user.lastName}.`,
    generatedPassword: password,
  };
}

export async function updateUserAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  const parsed = userSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Compte introuvable." };

  // Un administrateur ne peut pas se retirer à lui-même son propre rôle.
  if (target.id === admin.id && parsed.data.role !== ROLES.ADMIN) {
    return {
      error:
        "Vous ne pouvez pas modifier votre propre rôle d'administrateur.",
    };
  }

  const clash = await prisma.user.findFirst({
    where: { email: parsed.data.email, NOT: { id: userId } },
  });
  if (clash) return { error: "Cette adresse e-mail est déjà utilisée." };

  await prisma.user.update({ where: { id: userId }, data: parsed.data });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);

  return { success: "Modifications enregistrées." };
}

export async function toggleUserActiveAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return;

  // Se désactiver soi-même reviendrait à se verrouiller dehors.
  if (target.id === admin.id) return;

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !target.isActive },
  });

  revalidatePath("/admin/users");
  revalidatePath(`/admin/users/${userId}`);
}

export async function resetPasswordAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "Compte introuvable." };

  const password = generatePassword();

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
    },
  });

  revalidatePath(`/admin/users/${userId}`);

  return {
    success: `Nouveau mot de passe pour ${target.firstName} ${target.lastName}.`,
    generatedPassword: password,
  };
}

export async function deleteUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");

  if (userId === admin.id) return; // on ne supprime pas son propre compte

  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/admin/users");
  redirect("/admin/users");
}

/* ------------------------------------------------------------- Inscriptions */

export async function enrollStudentAction(formData: FormData) {
  await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "");
  const programId = String(formData.get("programId") ?? "");
  if (!studentId || !programId) return;

  await prisma.enrollment.upsert({
    where: { studentId_programId: { studentId, programId } },
    create: { studentId, programId },
    update: {},
  });

  revalidatePath(`/admin/users/${studentId}`);
}

export async function unenrollStudentAction(formData: FormData) {
  await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "");
  const programId = String(formData.get("programId") ?? "");
  if (!studentId || !programId) return;

  await prisma.enrollment.deleteMany({ where: { studentId, programId } });

  revalidatePath(`/admin/users/${studentId}`);
}

/* ------------------------------------------------------------------ Cycles */

const programSchema = z.object({
  name: z.string().trim().min(1, "Le nom du cycle est obligatoire."),
  description: z.string().trim().optional(),
});

export async function createProgramAction(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireAdmin();

  const parsed = programSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const existing = await prisma.program.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) return { error: "Un cycle porte déjà ce nom." };

  await prisma.program.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description || null,
    },
  });

  revalidatePath("/admin/programs");
  return { success: "Cycle créé." };
}

export async function deleteProgramAction(formData: FormData) {
  await requireAdmin();
  const programId = String(formData.get("programId") ?? "");
  if (!programId) return;

  await prisma.program.delete({ where: { id: programId } });
  revalidatePath("/admin/programs");
}

/* ------------------------------------------------------------------- Cours */

export async function deleteCourseAsAdminAction(formData: FormData) {
  await requireAdmin();
  const courseId = String(formData.get("courseId") ?? "");
  if (!courseId) return;

  await prisma.course.delete({ where: { id: courseId } });
  revalidatePath("/admin/courses");
}

export async function toggleCoursePublishAsAdminAction(formData: FormData) {
  await requireAdmin();
  const courseId = String(formData.get("courseId") ?? "");

  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) return;

  await prisma.course.update({
    where: { id: courseId },
    data: { isPublished: !course.isPublished },
  });

  revalidatePath("/admin/courses");
}
