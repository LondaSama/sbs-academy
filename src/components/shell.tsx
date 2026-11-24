import Link from "next/link";
import type { ReactNode } from "react";

import { logoutAction } from "@/app/actions/auth";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import type { SessionUser } from "@/lib/auth";
import { NavLink } from "@/components/nav-link";

const NAV: Record<Role, { href: string; label: string }[]> = {
  ADMIN: [
    { href: "/admin", label: "Tableau de bord" },
    { href: "/admin/users", label: "Accès & comptes" },
    { href: "/admin/programs", label: "Cycles" },
    { href: "/admin/courses", label: "Cours" },
  ],
  TEACHER: [
    { href: "/teacher", label: "Tableau de bord" },
    { href: "/teacher/courses", label: "Mes cours" },
    { href: "/teacher/students", label: "Mes élèves" },
    { href: "/teacher/grading", label: "Corrections" },
  ],
  STUDENT: [
    { href: "/student", label: "Mes cours" },
    { href: "/student/transcript", label: "Relevé de notes" },
  ],
};

export function Shell({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  const links = NAV[user.role];
  const initials =
    `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-navy-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <Link href={`/${user.role.toLowerCase()}`} className="flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-navy-900 text-xs font-bold text-gold-400">
              SBS
            </span>
            <span className="hidden text-sm font-semibold text-navy-900 sm:block">
              SBS Academy
            </span>
          </Link>

          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {links.map((link) => (
              <NavLink key={link.href} href={link.href}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-tight text-navy-900">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs leading-tight text-navy-400">
                {ROLE_LABELS[user.role]}
              </p>
            </div>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-navy-100 text-xs font-semibold text-navy-700">
              {initials}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-lg px-2.5 py-1.5 text-sm text-navy-500 transition-colors hover:bg-navy-50 hover:text-navy-900"
              >
                Quitter
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
  back,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-6">
      {back ? (
        <Link
          href={back.href}
          className="mb-2 inline-flex items-center gap-1 text-sm text-navy-500 transition-colors hover:text-navy-800"
        >
          <span aria-hidden>←</span> {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-navy-900">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-navy-500">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
