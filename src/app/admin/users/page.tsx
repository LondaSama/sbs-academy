import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  EmptyState,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/constants";

export const instant = false;

const ROLE_TONE: Record<Role, "info" | "neutral" | "success"> = {
  ADMIN: "info",
  TEACHER: "neutral",
  STUDENT: "success",
};

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; q?: string }>;
}) {
  const { role, q } = await searchParams;

  const roleFilter =
    role && Object.values(ROLES).includes(role as Role)
      ? (role as Role)
      : undefined;

  const users = await prisma.user.findMany({
    where: {
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(q
        ? {
            OR: [
              { firstName: { contains: q } },
              { lastName: { contains: q } },
              { email: { contains: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ role: "asc" }, { lastName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      isActive: true,
      mustChangePassword: true,
      createdAt: true,
      _count: { select: { enrollments: true, coursesTaught: true } },
    },
  });

  const tabs = [
    { label: "Tous", value: undefined },
    { label: "Élèves", value: ROLES.STUDENT },
    { label: "Professeurs", value: ROLES.TEACHER },
    { label: "Administrateurs", value: ROLES.ADMIN },
  ];

  return (
    <>
      <PageHeader
        title="Accès & comptes"
        description="Vous seul pouvez créer, modifier ou révoquer un accès à la plateforme."
        action={<ButtonLink href="/admin/users/new">Créer un accès</ButtonLink>}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {tabs.map((tab) => {
          const active = roleFilter === tab.value;
          const href = tab.value ? `/admin/users?role=${tab.value}` : "/admin/users";
          return (
            <Link
              key={tab.label}
              href={href}
              className={[
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-navy-800 text-white"
                  : "border border-navy-200 bg-white text-navy-700 hover:bg-navy-50",
              ].join(" ")}
            >
              {tab.label}
            </Link>
          );
        })}

        <form className="ml-auto" action="/admin/users">
          {roleFilter ? (
            <input type="hidden" name="role" value={roleFilter} />
          ) : null}
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Rechercher un nom ou un e-mail…"
            className="w-64 rounded-lg border border-navy-200 bg-white px-3 py-1.5 text-sm text-navy-900 placeholder:text-navy-300 focus:border-navy-500 focus:outline-none focus:ring-2 focus:ring-navy-500/20"
          />
        </form>
      </div>

      <Card>
        {users.length === 0 ? (
          <CardBody>
            <EmptyState
              title="Aucun compte trouvé"
              description="Ajustez votre recherche ou créez un nouvel accès."
              action={
                <ButtonLink href="/admin/users/new">Créer un accès</ButtonLink>
              }
            />
          </CardBody>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Nom</Th>
                <Th>Rôle</Th>
                <Th>Rattachement</Th>
                <Th>Statut</Th>
                <Th>{""}</Th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-navy-50/50">
                  <Td>
                    <div className="font-medium text-navy-900">
                      {u.firstName} {u.lastName}
                    </div>
                    <div className="text-xs text-navy-400">{u.email}</div>
                  </Td>
                  <Td>
                    <Badge tone={ROLE_TONE[u.role as Role]}>
                      {ROLE_LABELS[u.role as Role]}
                    </Badge>
                  </Td>
                  <Td className="text-sm text-navy-500">
                    {u.role === ROLES.STUDENT
                      ? `${u._count.enrollments} cycle${u._count.enrollments > 1 ? "s" : ""}`
                      : u.role === ROLES.TEACHER
                        ? `${u._count.coursesTaught} cours`
                        : "—"}
                  </Td>
                  <Td>
                    {!u.isActive ? (
                      <Badge tone="danger">Désactivé</Badge>
                    ) : u.mustChangePassword ? (
                      <Badge tone="warning">Mot de passe à changer</Badge>
                    ) : (
                      <Badge tone="success">Actif</Badge>
                    )}
                  </Td>
                  <Td>
                    <Link
                      href={`/admin/users/${u.id}`}
                      className="text-sm font-medium text-navy-600 hover:text-navy-900"
                    >
                      Ouvrir le profil
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
