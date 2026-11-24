import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/shell";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Stat,
} from "@/components/ui";
import { MAX_EXAMS_PER_COURSE, QUESTION_TYPE_LABELS, type QuestionType } from "@/lib/constants";

export const instant = false;

export default async function AdminCourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireAdmin();

  const course = await prisma.course.findUnique({
    where: { id },
    include: {
      teacher: { select: { id: true, firstName: true, lastName: true } },
      program: {
        select: { name: true, _count: { select: { enrollments: true } } },
      },
      chapters: {
        orderBy: { position: "asc" },
        include: {
          exercise: {
            include: { _count: { select: { questions: true, submissions: true } } },
          },
        },
      },
      exams: {
        orderBy: { position: "asc" },
        include: {
          questions: { select: { id: true, type: true, points: true } },
          _count: { select: { submissions: true } },
        },
      },
    },
  });

  if (!course) notFound();

  const chaptersWithoutExercise = course.chapters.filter((c) => !c.exercise);

  return (
    <>
      <PageHeader
        title={course.title}
        description={course.description ?? undefined}
        back={{ href: "/admin/courses", label: "Cours" }}
        action={
          course.isPublished ? (
            <Badge tone="success">Publié</Badge>
          ) : (
            <Badge tone="warning">Brouillon</Badge>
          )
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Professeur"
          value={
            <Link
              href={`/admin/users/${course.teacher.id}`}
              className="text-lg hover:text-navy-600"
            >
              {course.teacher.firstName} {course.teacher.lastName}
            </Link>
          }
        />
        <Stat
          label="Cycle"
          value={<span className="text-lg">{course.program.name}</span>}
          sub={`${course.program._count.enrollments} élève(s) concerné(s)`}
        />
        <Stat label="Chapitres" value={course.chapters.length} />
        <Stat
          label="Examens"
          value={`${course.exams.length}/${MAX_EXAMS_PER_COURSE}`}
        />
      </div>

      {chaptersWithoutExercise.length > 0 ? (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>{chaptersWithoutExercise.length} chapitre
          {chaptersWithoutExercise.length > 1 ? "s" : ""}</strong> sans exercice
          de fin de chapitre : {chaptersWithoutExercise.map((c) => c.title).join(", ")}.
          Le professeur doit en ajouter un avant de publier.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Chapitres et exercices"
            description="Chaque chapitre doit se terminer par un exercice."
          />
          {course.chapters.length === 0 ? (
            <CardBody>
              <EmptyState title="Aucun chapitre" />
            </CardBody>
          ) : (
            <ul className="divide-y divide-navy-50">
              {course.chapters.map((chapter) => (
                <li key={chapter.id} className="px-5 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy-900">
                        {chapter.position}. {chapter.title}
                      </p>
                      {chapter.exercise ? (
                        <p className="mt-0.5 text-xs text-navy-500">
                          {chapter.exercise.title} —{" "}
                          {chapter.exercise._count.questions} question(s),{" "}
                          {chapter.exercise._count.submissions} rendu(s)
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-amber-700">
                          Exercice manquant
                        </p>
                      )}
                    </div>
                    {chapter.isPublished ? (
                      <Badge tone="success">Publié</Badge>
                    ) : (
                      <Badge tone="neutral">Brouillon</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Examens principaux"
            description={`Maximum ${MAX_EXAMS_PER_COURSE} examens, comptant pour 60 % de la note finale.`}
          />
          {course.exams.length === 0 ? (
            <CardBody>
              <EmptyState title="Aucun examen" />
            </CardBody>
          ) : (
            <ul className="divide-y divide-navy-50">
              {course.exams.map((exam) => {
                const total = exam.questions.reduce((s, q) => s + q.points, 0);
                const types = [...new Set(exam.questions.map((q) => q.type))];
                return (
                  <li key={exam.id} className="px-5 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-navy-900">
                          Examen {exam.position} — {exam.title}
                        </p>
                        <p className="mt-0.5 text-xs text-navy-500">
                          {exam.questions.length} question(s) · {total} point(s)
                          · {exam._count.submissions} copie(s)
                        </p>
                        {types.length > 0 ? (
                          <p className="mt-1 text-xs text-navy-400">
                            {types
                              .map(
                                (t) =>
                                  QUESTION_TYPE_LABELS[t as QuestionType] ?? t,
                              )
                              .join(" · ")}
                          </p>
                        ) : null}
                      </div>
                      {exam.isPublished ? (
                        <Badge tone="success">Publié</Badge>
                      ) : (
                        <Badge tone="neutral">Brouillon</Badge>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
