import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth";
import { PageHeader } from "@/components/shell";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Table,
  Td,
  Th,
} from "@/components/ui";

export const instant = false;

function formatDate(d: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export default async function TeacherGradingPage() {
  const teacher = await requireTeacher();

  const courseIds = (
    await prisma.course.findMany({
      where: { teacherId: teacher.id },
      select: { id: true },
    })
  ).map((c) => c.id);

  const where = {
    OR: [
      { exercise: { chapter: { courseId: { in: courseIds } } } },
      { exam: { courseId: { in: courseIds } } },
    ],
  };

  const [pending, graded] = await Promise.all([
    prisma.submission.findMany({
      where: { ...where, needsManualGrading: true },
      orderBy: { submittedAt: "asc" },
      include: {
        student: { select: { firstName: true, lastName: true } },
        exercise: {
          select: { title: true, chapter: { select: { course: { select: { title: true } } } } },
        },
        exam: { select: { title: true, course: { select: { title: true } } } },
      },
    }),
    prisma.submission.findMany({
      where: { ...where, needsManualGrading: false, status: "GRADED" },
      orderBy: { gradedAt: "desc" },
      take: 10,
      include: {
        student: { select: { firstName: true, lastName: true } },
        exercise: {
          select: { title: true, chapter: { select: { course: { select: { title: true } } } } },
        },
        exam: { select: { title: true, course: { select: { title: true } } } },
      },
    }),
  ]);

  const label = (s: (typeof pending)[number]) =>
    s.exercise
      ? {
          course: s.exercise.chapter.course.title,
          item: s.exercise.title,
          kind: "Exercice",
        }
      : {
          course: s.exam?.course.title ?? "—",
          item: s.exam?.title ?? "—",
          kind: "Examen",
        };

  return (
    <>
      <PageHeader
        title="Corrections"
        description="Les réponses rédigées demandent votre appréciation ; les QCM et Oui/Non sont corrigés automatiquement."
      />

      <div className="space-y-6">
        <Card>
          <CardHeader
            title="En attente de correction"
            description={`${pending.length} copie(s)`}
          />
          {pending.length === 0 ? (
            <CardBody>
              <EmptyState
                title="Rien à corriger"
                description="Toutes les copies rendues ont été corrigées."
              />
            </CardBody>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Élève</Th>
                  <Th>Évaluation</Th>
                  <Th>Cours</Th>
                  <Th>Rendu le</Th>
                  <Th>{""}</Th>
                </tr>
              </thead>
              <tbody>
                {pending.map((s) => {
                  const l = label(s);
                  return (
                    <tr key={s.id} className="hover:bg-navy-50/50">
                      <Td>
                        <span className="font-medium text-navy-900">
                          {s.student.firstName} {s.student.lastName}
                        </span>
                      </Td>
                      <Td>
                        <Badge
                          tone={l.kind === "Examen" ? "info" : "neutral"}
                        >
                          {l.kind}
                        </Badge>
                        <span className="ml-2 text-sm text-navy-700">
                          {l.item}
                        </span>
                      </Td>
                      <Td className="text-sm text-navy-500">{l.course}</Td>
                      <Td className="text-sm text-navy-500">
                        {formatDate(s.submittedAt)}
                      </Td>
                      <Td>
                        <Link
                          href={`/teacher/grading/${s.id}`}
                          className="text-sm font-medium text-navy-600 hover:text-navy-900"
                        >
                          Corriger
                        </Link>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>

        {graded.length > 0 ? (
          <Card>
            <CardHeader title="Corrigées récemment" />
            <Table>
              <thead>
                <tr>
                  <Th>Élève</Th>
                  <Th>Évaluation</Th>
                  <Th>Note</Th>
                  <Th>Corrigée le</Th>
                </tr>
              </thead>
              <tbody>
                {graded.map((s) => {
                  const l = label(s);
                  return (
                    <tr key={s.id}>
                      <Td>
                        {s.student.firstName} {s.student.lastName}
                      </Td>
                      <Td className="text-sm text-navy-500">{l.item}</Td>
                      <Td className="tabular-nums">
                        {s.score} / {s.maxScore}
                      </Td>
                      <Td className="text-sm text-navy-500">
                        {s.gradedAt ? formatDate(s.gradedAt) : "—"}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </Card>
        ) : null}
      </div>
    </>
  );
}
