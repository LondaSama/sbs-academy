import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/prisma";
import { HOME_BY_ROLE, ROLES, type Role } from "@/lib/constants";

const COOKIE_NAME = "sbs_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 8; // 8 heures

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET manquant ou trop court (32 caractères minimum). Vérifiez votre fichier .env",
    );
  }
  return new TextEncoder().encode(secret);
}

export type SessionUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  mustChangePassword: boolean;
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: string): Promise<void> {
  const token = await new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

/** Retourne l'utilisateur connecté, ou null. Ne redirige jamais. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string") return null;
    userId = payload.sub;
  } catch {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
    },
  });

  // Un compte désactivé par l'administrateur perd immédiatement l'accès.
  if (!user || !user.isActive) return null;

  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role as Role,
    mustChangePassword: user.mustChangePassword,
  };
}

/** Exige une session valide, sinon redirige vers la connexion. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Exige une session valide ET l'un des rôles donnés.
 * Un utilisateur connecté mais sans le bon rôle est renvoyé vers son espace.
 */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();

  if (user.mustChangePassword) redirect("/change-password");
  if (!roles.includes(user.role)) redirect(HOME_BY_ROLE[user.role]);

  return user;
}

export const requireAdmin = () => requireRole(ROLES.ADMIN);
export const requireTeacher = () => requireRole(ROLES.TEACHER);
export const requireStudent = () => requireRole(ROLES.STUDENT);
