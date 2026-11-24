import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Stat,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { ROLES } from "@/lib/constants";

export const instant = false;

export default async function AdminDashboard() {
  const [
    studentCount,
    teacherCount,
    adminCount,
    programCount,
    courseCount,
    publishedCourseCount,
    pendingGrading,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count({ where: { role: ROLES.STUDENT } }),
    prisma.user.count({ where: { role: ROLES.TEACHER } }),
    prisma.user.count({ where: { role: ROLES.ADMIN } }),
    prisma.program.count(),
    prisma.course.count(),
    prisma.course.count({ where: { isPublished: true } }),
    prisma.submission.count({ where: { needsManualGrading: true } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isActive: true,
        mustChangePassword: true,
      },
    }),
  ]);

  return (
    <>
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de la plateforme SBS Academy."
        action={
          <ButtonLink href="/admin/users/new">Créer un accès</ButtonLink>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Élèves" value={studentCount} />
        <Stat label="Professeurs" value={teacherCount} />
        <Stat
          label="Cours"
          value={courseCount}
          sub={`${publishedCourseCount} publié${publishedCourseCount > 1 ? "s" : ""}`}
        />
        <Stat
          label="Copies à corriger"
          value={pendingGrading}
          sub={pendingGrading > 0 ? "en attente des professeurs" : "rien en attente"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Comptes récents"
            description="Les derniers accès créés sur la plateforme."
            action={
              <Link
                href="/admin/users"
                className="text-sm font-medium text-navy-600 hover:text-navy-900"
              >
                Tout voir
              </Link>
            }
          />
          {recentUsers.length === 0 ? (
            <CardBody>
              <EmptyState
                title="Aucun compte"
                description="Créez le premier accès pour commencer."
              />
            </CardBody>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Nom</Th>
                  <Th>Rôle</Th>
                  <Th>Statut</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map((u) => (
                  <tr key={u.id}>
                    <Td>
                      <div className="font-medium text-navy-900">
                        {u.firstName} {u.lastName}
                      </div>
                      <div className="text-xs text-navy-400">{u.email}</div>
                    </Td>
                    <Td>
                      <Badge
                        tone={
                          u.role === ROLES.ADMIN
                            ? "info"
                            : u.role === ROLES.TEACHER
                              ? "neutral"
                              : "success"
                        }
                      >
                        {u.role === ROLES.ADMIN
                          ? "Admin"
                          : u.role === ROLES.TEACHER
                            ? "Professeur"
                            : "Élève"}
                      </Badge>
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
                        Ouvrir
                      </Link>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card>

        <Card>
          <CardHeader title="Raccourcis" />
          <CardBody className="space-y-2">
            <ButtonLink
              href="/admin/users/new"
              variant="secondary"
              className="w-full"
            >
              Créer un accès
            </ButtonLink>
            <ButtonLink
              href="/admin/programs"
              variant="secondary"
              className="w-full"
            >
              Gérer les cycles ({programCount})
            </ButtonLink>
            <ButtonLink
              href="/admin/courses"
              variant="secondary"
              className="w-full"
            >
              Superviser les cours ({courseCount})
            </ButtonLink>
            <p className="pt-2 text-xs leading-relaxed text-navy-400">
              Seul l&apos;administrateur crée les accès. Les professeurs et les
              élèves ne peuvent pas s&apos;inscrire eux-mêmes.
              <br />
              <span className="text-navy-300">
                {adminCount} compte{adminCount > 1 ? "s" : ""} administrateur
                {adminCount > 1 ? "s" : ""}.
              </span>
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
