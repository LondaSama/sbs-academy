import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth";
import { buildCourseTranscript } from "@/lib/grading";
import { PageHeader } from "@/components/shell";
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  MarkDisplay,
} from "@/components/ui";

export const instant = false;

export default async function StudentCoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ examen?: string }>;
}) {
  const { courseId } = await params;
  const { examen } = await searchParams;
  const student = await requireStudent();

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      isPublished: true,
      program: { enrollments: { some: { studentId: student.id } } },
    },
    include: {
      teacher: { select: { firstName: true, lastName: true } },
      program: { select: { name: true } },
      chapters: {
        where: { isPublished: true },
        orderBy: { position: "asc" },
        include: {
          progress: { where: { studentId: student.id }, select: { id: true } },
          exercise: {
            select: {
              id: true,
              submissions: {
                where: { studentId: student.id },
                select: {
                  score: true,
                  maxScore: true,
                  needsManualGrading: true,
                },
              },
            },
          },
        },
      },
      exams: {
        where: { isPublished: true },
        orderBy: { position: "asc" },
        include: {
          submissions: {
            where: { studentId: student.id },
            select: { score: true, maxScore: true, needsManualGrading: true },
          },
          _count: { select: { questions: true } },
        },
      },
    },
  });

  if (!course) notFound();

  const transcript = await buildCourseTranscript(student.id, course.id);

  const doneCount = course.chapters.filter((c) => c.progress.length > 0).length;

  return (
    <>
      <PageHeader
        title={course.title}
        description={`${course.program.name} · ${course.teacher.firstName} ${course.teacher.lastName}`}
        back={{ href: "/student", label: "Mes cours" }}
      />

      {examen === "rendu" ? (
        <div className="mb-6">
          <Alert tone="success">
            Votre examen a bien été enregistré. La note apparaîtra dans votre
            relevé dès que le professeur aura corrigé les réponses rédigées.
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Chapitres"
              description={`${doneCount} sur ${course.chapters.length} terminé${doneCount > 1 ? "s" : ""}.`}
            />
            {course.chapters.length === 0 ? (
              <CardBody>
                <EmptyState
                  title="Aucun chapitre publié"
                  description="Votre professeur n'a pas encore publié de chapitre."
                />
              </CardBody>
            ) : (
              <ul className="divide-y divide-navy-50">
                {course.chapters.map((chapter) => {
                  const submission = chapter.exercise?.submissions[0];
                  const done = chapter.progress.length > 0;

                  return (
                    <li key={chapter.id}>
                      <Link
                        href={`/student/courses/${course.id}/chapters/${chapter.id}`}
                        className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-navy-50/50"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span
                            className={[
                              "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold",
                              done
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-navy-100 text-navy-600",
                            ].join(" ")}
                          >
                            {done ? "✓" : chapter.position}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-navy-900">
                              {chapter.title}
                            </p>
                            <p className="text-xs text-navy-400">
                              {submission
                                ? submission.needsManualGrading
                                  ? "Exercice rendu — correction en cours"
                                  : `Exercice : ${submission.score}/${submission.maxScore}`
                                : "Exercice à faire"}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 text-sm text-navy-400">→</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Examens"
              description="Les examens comptent pour 60 % de votre note finale."
            />
            {course.exams.length === 0 ? (
              <CardBody>
                <EmptyState
                  title="Aucun examen ouvert"
                  description="Les examens apparaîtront ici lorsque votre professeur les publiera."
                />
              </CardBody>
            ) : (
              <ul className="divide-y divide-navy-50">
                {course.exams.map((exam) => {
                  const submission = exam.submissions[0];
                  return (
                    <li
                      key={exam.id}
                      className="flex items-center justify-between gap-4 px-5 py-4"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-navy-900">
                          Examen {exam.position} — {exam.title}
                        </p>
                        <p className="text-xs text-navy-400">
                          {exam._count.questions} question(s)
                        </p>
                      </div>
                      {submission ? (
                        <Badge
                          tone={
                            submission.needsManualGrading ? "warning" : "success"
                          }
                        >
                          {submission.needsManualGrading
                            ? "En correction"
                            : `${submission.score}/${submission.maxScore}`}
                        </Badge>
                      ) : (
                        <Link
                          href={`/student/exams/${exam.id}`}
                          className="shrink-0 rounded-lg bg-navy-800 px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-navy-900"
                        >
                          Composer
                        </Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader title="Mes résultats" />
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-navy-500">Exercices</span>
                <MarkDisplay mark={transcript?.exerciseAverage ?? null} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-navy-500">Examens</span>
                <MarkDisplay mark={transcript?.examAverage ?? null} />
              </div>
              <div className="flex items-center justify-between border-t border-navy-100 pt-3">
                <span className="text-sm font-medium text-navy-800">
                  Note finale
                </span>
                <MarkDisplay mark={transcript?.finalMark ?? null} />
              </div>
              <Link
                href="/student/transcript"
                className="block pt-1 text-sm font-medium text-navy-600 hover:text-navy-900"
              >
                Voir mon relevé complet →
              </Link>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
