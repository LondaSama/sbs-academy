import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth";
import { PageHeader } from "@/components/shell";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Stat,
} from "@/components/ui";
import { MAX_EXAMS_PER_COURSE } from "@/lib/constants";

export const instant = false;

export default async function TeacherDashboard() {
  const teacher = await requireTeacher();

  const courses = await prisma.course.findMany({
    where: { teacherId: teacher.id },
    orderBy: { position: "asc" },
    include: {
      program: {
        select: { name: true, _count: { select: { enrollments: true } } },
      },
      chapters: {
        include: { exercise: { include: { _count: { select: { questions: true } } } } },
      },
      _count: { select: { exams: true } },
    },
  });

  const courseIds = courses.map((c) => c.id);

  const pendingCount = await prisma.submission.count({
    where: {
      needsManualGrading: true,
      OR: [
        { exercise: { chapter: { courseId: { in: courseIds } } } },
        { exam: { courseId: { in: courseIds } } },
      ],
    },
  });

  const studentCount = await prisma.user.count({
    where: {
      role: "STUDENT",
      enrollments: {
        some: { programId: { in: courses.map((c) => c.programId) } },
      },
    },
  });

  const incomplete = courses.filter((c) =>
    c.chapters.some((ch) => !ch.exercise || ch.exercise._count.questions === 0),
  );

  return (
    <>
      <PageHeader
        title={`Bonjour ${teacher.firstName}`}
        description="Vos cours, vos élèves et les copies qui vous attendent."
        action={<ButtonLink href="/teacher/courses/new">Nouveau cours</ButtonLink>}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Mes cours" value={courses.length} />
        <Stat label="Mes élèves" value={studentCount} />
        <Stat
          label="Copies à corriger"
          value={pendingCount}
          sub={pendingCount > 0 ? "réponses rédigées" : "tout est à jour"}
        />
        <Stat
          label="Cours publiés"
          value={courses.filter((c) => c.isPublished).length}
        />
      </div>

      {pendingCount > 0 ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            <strong>{pendingCount} copie{pendingCount > 1 ? "s" : ""}</strong>{" "}
            contient des réponses rédigées en attente de votre correction.
          </p>
          <ButtonLink href="/teacher/grading" variant="gold">
            Corriger maintenant
          </ButtonLink>
        </div>
      ) : null}

      {incomplete.length > 0 ? (
        <div className="mb-6 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
          Rappel : chaque chapitre doit se terminer par un exercice.{" "}
          {incomplete.length} cours à compléter —{" "}
          {incomplete.map((c) => c.title).join(", ")}.
        </div>
      ) : null}

      <Card>
        <CardHeader
          title="Mes cours"
          action={
            <Link
              href="/teacher/courses"
              className="text-sm font-medium text-navy-600 hover:text-navy-900"
            >
              Tout voir
            </Link>
          }
        />
        {courses.length === 0 ? (
          <CardBody>
            <EmptyState
              title="Aucun cours pour le moment"
              description="Créez votre premier cours, ajoutez-y des chapitres et leurs exercices."
              action={
                <ButtonLink href="/teacher/courses/new">
                  Créer un cours
                </ButtonLink>
              }
            />
          </CardBody>
        ) : (
          <ul className="divide-y divide-navy-50">
            {courses.map((course) => {
              const missing = course.chapters.filter(
                (ch) => !ch.exercise || ch.exercise._count.questions === 0,
              ).length;
              return (
                <li key={course.id}>
                  <Link
                    href={`/teacher/courses/${course.id}`}
                    className="flex items-start justify-between gap-4 px-5 py-4 transition-colors hover:bg-navy-50/50"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-navy-900">{course.title}</p>
                      <p className="mt-0.5 text-sm text-navy-500">
                        {course.program.name} ·{" "}
                        {course.program._count.enrollments} élève(s) ·{" "}
                        {course.chapters.length} chapitre(s) ·{" "}
                        {course._count.exams}/{MAX_EXAMS_PER_COURSE} examen(s)
                      </p>
                      {missing > 0 ? (
                        <p className="mt-1 text-xs text-amber-700">
                          {missing} chapitre(s) sans exercice complet
                        </p>
                      ) : null}
                    </div>
                    <div className="shrink-0">
                      {course.isPublished ? (
                        <Badge tone="success">Publié</Badge>
                      ) : (
                        <Badge tone="warning">Brouillon</Badge>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
