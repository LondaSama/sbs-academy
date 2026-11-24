import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth";
import { PageHeader } from "@/components/shell";
import {
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
} from "@/components/ui";
import { MAX_EXAMS_PER_COURSE } from "@/lib/constants";
import { CourseForm } from "../course-form";
import { PublishCourse, NewChapterForm, NewExamForm, DeleteCourse } from "./course-panels";

export const instant = false;

export default async function TeacherCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const teacher = await requireTeacher();

  const course = await prisma.course.findFirst({
    where: { id: courseId, teacherId: teacher.id },
    include: {
      program: { select: { name: true } },
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
        include: { _count: { select: { questions: true, submissions: true } } },
      },
    },
  });

  if (!course) notFound();

  const programs = await prisma.program.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const canAddExam = course.exams.length < MAX_EXAMS_PER_COURSE;

  return (
    <>
      <PageHeader
        title={course.title}
        description={`${course.program.name}${course.description ? ` — ${course.description}` : ""}`}
        back={{ href: "/teacher/courses", label: "Mes cours" }}
        action={
          course.isPublished ? (
            <Badge tone="success">Publié</Badge>
          ) : (
            <Badge tone="warning">Brouillon</Badge>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* -------------------------------------------------- Chapitres */}
          <Card>
            <CardHeader
              title="Chapitres"
              description="Chaque chapitre se termine obligatoirement par un exercice."
            />
            {course.chapters.length === 0 ? (
              <CardBody>
                <EmptyState
                  title="Aucun chapitre"
                  description="Ajoutez le premier chapitre de votre cours ci-dessous."
                />
              </CardBody>
            ) : (
              <ul className="divide-y divide-navy-50">
                {course.chapters.map((chapter) => {
                  const questions = chapter.exercise?._count.questions ?? 0;
                  const ready = questions > 0;
                  return (
                    <li key={chapter.id}>
                      <Link
                        href={`/teacher/courses/${course.id}/chapters/${chapter.id}`}
                        className="flex items-start justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-navy-50/50"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-navy-900">
                            {chapter.position}. {chapter.title}
                          </p>
                          <p className="mt-0.5 text-xs text-navy-500">
                            {ready
                              ? `Exercice : ${questions} question(s) · ${chapter.exercise?._count.submissions ?? 0} rendu(s)`
                              : "Exercice à compléter — aucune question"}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {!ready ? (
                            <Badge tone="warning">À compléter</Badge>
                          ) : chapter.isPublished ? (
                            <Badge tone="success">Publié</Badge>
                          ) : (
                            <Badge tone="neutral">Brouillon</Badge>
                          )}
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
            <CardBody className="border-t border-navy-100 bg-navy-50/40">
              <NewChapterForm courseId={course.id} />
            </CardBody>
          </Card>

          {/* ---------------------------------------------------- Examens */}
          <Card>
            <CardHeader
              title="Examens principaux"
              description={`${course.exams.length} sur ${MAX_EXAMS_PER_COURSE} — ils comptent pour 60 % de la note finale.`}
            />
            {course.exams.length === 0 ? (
              <CardBody>
                <EmptyState
                  title="Aucun examen"
                  description="Vous pouvez créer jusqu'à trois examens principaux."
                />
              </CardBody>
            ) : (
              <ul className="divide-y divide-navy-50">
                {course.exams.map((exam) => (
                  <li key={exam.id}>
                    <Link
                      href={`/teacher/courses/${course.id}/exams/${exam.id}`}
                      className="flex items-start justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-navy-50/50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-navy-900">
                          Examen {exam.position} — {exam.title}
                        </p>
                        <p className="mt-0.5 text-xs text-navy-500">
                          {exam._count.questions} question(s) ·{" "}
                          {exam._count.submissions} copie(s)
                        </p>
                      </div>
                      {exam._count.questions === 0 ? (
                        <Badge tone="warning">À compléter</Badge>
                      ) : exam.isPublished ? (
                        <Badge tone="success">Publié</Badge>
                      ) : (
                        <Badge tone="neutral">Brouillon</Badge>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <CardBody className="border-t border-navy-100 bg-navy-50/40">
              {canAddExam ? (
                <NewExamForm courseId={course.id} />
              ) : (
                <p className="text-sm text-navy-500">
                  Vous avez atteint la limite de {MAX_EXAMS_PER_COURSE} examens
                  principaux pour ce cours.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* ------------------------------------------------------ Colonne */}
        <div className="space-y-6">
          <Card>
            <CardHeader title="Publication" />
            <CardBody>
              <PublishCourse
                courseId={course.id}
                isPublished={course.isPublished}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Réglages du cours" />
            <CardBody>
              <CourseForm
                programs={programs}
                mode="edit"
                course={{
                  id: course.id,
                  title: course.title,
                  description: course.description,
                  programId: course.programId,
                }}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Supprimer le cours" />
            <CardBody>
              <DeleteCourse courseId={course.id} title={course.title} />
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
