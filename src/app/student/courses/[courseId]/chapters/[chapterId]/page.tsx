import Link from "next/link";
import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth";
import { PageHeader } from "@/components/shell";
import {
  Alert,
  Badge,
  Card,
  CardBody,
  CardHeader,
} from "@/components/ui";
import { CourseContent } from "@/components/course-content";
import { AnswerForm } from "@/components/answer-form";
import { QUESTION_TYPES } from "@/lib/constants";

export const instant = false;

export default async function StudentChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string; chapterId: string }>;
  searchParams: Promise<{ rendu?: string }>;
}) {
  const { courseId, chapterId } = await params;
  const { rendu } = await searchParams;
  const student = await requireStudent();

  const chapter = await prisma.chapter.findFirst({
    where: {
      id: chapterId,
      courseId,
      isPublished: true,
      course: {
        isPublished: true,
        program: { enrollments: { some: { studentId: student.id } } },
      },
    },
    include: {
      course: { select: { id: true, title: true } },
      exercise: {
        include: {
          questions: { orderBy: { position: "asc" } },
          submissions: {
            where: { studentId: student.id },
            include: {
              answers: { include: { question: true } },
            },
          },
        },
      },
    },
  });

  if (!chapter) notFound();

  const submission = chapter.exercise?.submissions[0];

  const nextChapter = await prisma.chapter.findFirst({
    where: { courseId, isPublished: true, position: { gt: chapter.position } },
    orderBy: { position: "asc" },
    select: { id: true, title: true },
  });

  return (
    <>
      <PageHeader
        title={chapter.title}
        description={`Chapitre ${chapter.position}`}
        back={{
          href: `/student/courses/${courseId}`,
          label: chapter.course.title,
        }}
        action={
          submission ? (
            <Badge tone={submission.needsManualGrading ? "warning" : "success"}>
              {submission.needsManualGrading
                ? "Rendu — en correction"
                : `${submission.score}/${submission.maxScore}`}
            </Badge>
          ) : (
            <Badge tone="neutral">Exercice à faire</Badge>
          )
        }
      />

      {rendu === "1" ? (
        <div className="mb-6">
          <Alert tone="success">
            Exercice envoyé. Les questions à choix sont corrigées
            immédiatement ; les réponses rédigées seront notées par votre
            professeur.
          </Alert>
        </div>
      ) : null}

      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader title="Le cours" />
          <CardBody>
            <CourseContent content={chapter.content} />
          </CardBody>
        </Card>

        {chapter.exercise && chapter.exercise.questions.length > 0 ? (
          <Card>
            <CardHeader
              title={chapter.exercise.title}
              description={
                chapter.exercise.instructions ??
                "Répondez aux questions pour valider ce chapitre."
              }
            />
            <CardBody>
              {submission ? (
                <div className="space-y-4">
                  <Alert
                    tone={submission.needsManualGrading ? "warning" : "success"}
                  >
                    {submission.needsManualGrading
                      ? "Vous avez rendu cet exercice. Votre professeur doit encore corriger vos réponses rédigées."
                      : `Exercice corrigé : ${submission.score} / ${submission.maxScore} points.`}
                  </Alert>

                  {submission.feedback ? (
                    <div className="rounded-lg border border-navy-200 bg-navy-50 px-4 py-3">
                      <p className="text-xs font-medium text-navy-400">
                        Appréciation du professeur
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-navy-800">
                        {submission.feedback}
                      </p>
                    </div>
                  ) : null}

                  <ol className="space-y-3">
                    {submission.answers.map((a, i) => {
                      const options = JSON.parse(
                        a.question.optionsJson,
                      ) as string[];
                      let display = a.value;
                      if (a.question.type === QUESTION_TYPES.YES_NO) {
                        display = a.value === "true" ? "Oui" : "Non";
                      } else if (a.question.type === QUESTION_TYPES.MCQ) {
                        display = options[Number(a.value)] ?? "—";
                      }

                      return (
                        <li
                          key={a.id}
                          className="rounded-lg border border-navy-100 p-3.5"
                        >
                          <div className="mb-1.5 flex items-start justify-between gap-3">
                            <p className="text-sm font-medium text-navy-900">
                              <span className="mr-1 text-navy-400">
                                {i + 1}.
                              </span>
                              {a.question.prompt}
                            </p>
                            <span className="shrink-0 text-xs tabular-nums text-navy-500">
                              {a.pointsAwarded}/{a.question.points}
                            </span>
                          </div>
                          <p className="whitespace-pre-wrap text-sm text-navy-600">
                            {display}
                          </p>
                          {a.isCorrect === null ? (
                            <p className="mt-1 text-xs text-amber-700">
                              En attente de correction
                            </p>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ) : (
                <AnswerForm
                  questions={chapter.exercise.questions.map((q) => ({
                    id: q.id,
                    type: q.type,
                    prompt: q.prompt,
                    options: JSON.parse(q.optionsJson) as string[],
                    points: q.points,
                  }))}
                  exerciseId={chapter.exercise.id}
                  submitLabel="Envoyer mes réponses"
                />
              )}
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody>
              <p className="text-sm text-navy-500">
                Aucun exercice n&apos;est disponible pour ce chapitre.
              </p>
            </CardBody>
          </Card>
        )}

        {nextChapter ? (
          <div className="flex justify-end">
            <Link
              href={`/student/courses/${courseId}/chapters/${nextChapter.id}`}
              className="inline-flex items-center gap-2 rounded-lg border border-navy-200 bg-white px-4 py-2 text-sm font-medium text-navy-800 transition-colors hover:bg-navy-50"
            >
              Chapitre suivant : {nextChapter.title} <span aria-hidden>→</span>
            </Link>
          </div>
        ) : null}
      </div>
    </>
  );
}
