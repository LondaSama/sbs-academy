import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { buildFullTranscript } from "@/lib/grading";
import { PageHeader } from "@/components/shell";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  MarkDisplay,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/constants";
import { EditUserForm } from "./edit-user-form";
import { DangerZone } from "./danger-zone";
import { EnrollmentManager } from "./enrollment-manager";

export const instant = false;

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = await requireAdmin();

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      enrollments: { include: { program: true } },
      coursesTaught: {
        include: {
          program: { select: { name: true } },
          _count: { select: { chapters: true, exams: true } },
        },
        orderBy: { position: "asc" },
      },
    },
  });

  if (!user) notFound();

  const role = user.role as Role;
  const isSelf = user.id === admin.id;

  const programs = await prisma.program.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const transcript =
    role === ROLES.STUDENT ? await buildFullTranscript(user.id) : null;

  return (
    <>
      <PageHeader
        title={`${user.firstName} ${user.lastName}`}
        description={user.email}
        back={{ href: "/admin/users", label: "Accès & comptes" }}
        action={
          <div className="flex items-center gap-2">
            <Badge
              tone={
                role === ROLES.ADMIN
                  ? "info"
                  : role === ROLES.TEACHER
                    ? "neutral"
                    : "success"
              }
            >
              {ROLE_LABELS[role]}
            </Badge>
            {!user.isActive ? (
              <Badge tone="danger">Désactivé</Badge>
            ) : user.mustChangePassword ? (
              <Badge tone="warning">Mot de passe à changer</Badge>
            ) : (
              <Badge tone="success">Actif</Badge>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Informations du compte"
              description="Modifiez l'identité et le rôle de cette personne."
            />
            <CardBody>
              <EditUserForm
                user={{
                  id: user.id,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  email: user.email,
                  role,
                }}
                isSelf={isSelf}
              />
            </CardBody>
          </Card>

          {role === ROLES.STUDENT ? (
            <>
              <Card>
                <CardHeader
                  title="Cycles suivis"
                  description="Inscrivez ou retirez cet élève d'un cycle."
                />
                <CardBody>
                  <EnrollmentManager
                    studentId={user.id}
                    programs={programs}
                    enrolled={user.enrollments.map((e) => ({
                      id: e.program.id,
                      name: e.program.name,
                    }))}
                  />
                </CardBody>
              </Card>

              <Card>
                <CardHeader
                  title="Progression et notes"
                  description="Le relevé tel que l'élève le voit."
                />
                {!transcript || transcript.length === 0 ? (
                  <CardBody>
                    <EmptyState
                      title="Aucun cycle"
                      description="Inscrivez cet élève à un cycle pour suivre sa progression."
                    />
                  </CardBody>
                ) : (
                  <CardBody className="space-y-6">
                    {transcript.map((program) => (
                      <div key={program.id}>
                        <div className="mb-2 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-navy-900">
                            {program.name}
                          </h3>
                          <span className="text-sm text-navy-500">
                            Moyenne :{" "}
                            <MarkDisplay mark={program.average} />
                          </span>
                        </div>
                        {program.courses.length === 0 ? (
                          <p className="text-sm text-navy-400">
                            Aucun cours publié dans ce cycle.
                          </p>
                        ) : (
                          <Table>
                            <thead>
                              <tr>
                                <Th>Cours</Th>
                                <Th>Exercices</Th>
                                <Th>Examens</Th>
                                <Th>Note finale</Th>
                              </tr>
                            </thead>
                            <tbody>
                              {program.courses.map((c) => (
                                <tr key={c.courseId}>
                                  <Td>{c.courseTitle}</Td>
                                  <Td>
                                    <MarkDisplay mark={c.exerciseAverage} />
                                    <span className="ml-1 text-xs text-navy-400">
                                      ({c.exercises.length})
                                    </span>
                                  </Td>
                                  <Td>
                                    <MarkDisplay mark={c.examAverage} />
                                    <span className="ml-1 text-xs text-navy-400">
                                      ({c.exams.length}/3)
                                    </span>
                                  </Td>
                                  <Td>
                                    <MarkDisplay mark={c.finalMark} />
                                  </Td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        )}
                      </div>
                    ))}
                  </CardBody>
                )}
              </Card>
            </>
          ) : null}

          {role === ROLES.TEACHER ? (
            <Card>
              <CardHeader
                title="Cours enseignés"
                description={`${user.coursesTaught.length} cours sous sa responsabilité.`}
              />
              {user.coursesTaught.length === 0 ? (
                <CardBody>
                  <EmptyState
                    title="Aucun cours"
                    description="Ce professeur n'a pas encore créé de cours."
                  />
                </CardBody>
              ) : (
                <Table>
                  <thead>
                    <tr>
                      <Th>Cours</Th>
                      <Th>Cycle</Th>
                      <Th>Contenu</Th>
                      <Th>Statut</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.coursesTaught.map((c) => (
                      <tr key={c.id}>
                        <Td>
                          <Link
                            href={`/admin/courses/${c.id}`}
                            className="font-medium text-navy-700 hover:text-navy-900"
                          >
                            {c.title}
                          </Link>
                        </Td>
                        <Td className="text-sm text-navy-500">
                          {c.program.name}
                        </Td>
                        <Td className="text-sm text-navy-500">
                          {c._count.chapters} chapitre
                          {c._count.chapters > 1 ? "s" : ""} · {c._count.exams}
                          /3 examen{c._count.exams > 1 ? "s" : ""}
                        </Td>
                        <Td>
                          {c.isPublished ? (
                            <Badge tone="success">Publié</Badge>
                          ) : (
                            <Badge tone="warning">Brouillon</Badge>
                          )}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              )}
            </Card>
          ) : null}
        </div>

        <div>
          <DangerZone
            userId={user.id}
            isActive={user.isActive}
            isSelf={isSelf}
            fullName={`${user.firstName} ${user.lastName}`}
          />
        </div>
      </div>
    </>
  );
}
