import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth";
import { PageHeader } from "@/components/shell";
import { Badge, Card, CardBody, CardHeader } from "@/components/ui";
import { QUESTION_TYPES } from "@/lib/constants";
import { GradingForm } from "./grading-form";

export const instant = false;

export default async function GradeSubmissionPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const { submissionId } = await params;
  const teacher = await requireTeacher();

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      student: { select: { firstName: true, lastName: true, email: true } },
      answers: {
        include: { question: true },
        orderBy: { question: { position: "asc" } },
      },
      exercise: {
        select: {
          title: true,
          chapter: {
            select: { title: true, course: { select: { title: true, teacherId: true } } },
          },
        },
      },
      exam: {
        select: {
          title: true,
          position: true,
          course: { select: { title: true, teacherId: true } },
        },
      },
    },
  });

  if (!submission) notFound();

  const ownerId =
    submission.exercise?.chapter.course.teacherId ??
    submission.exam?.course.teacherId;
  if (ownerId !== teacher.id) notFound();

  const context = submission.exercise
    ? {
        kind: "Exercice",
        item: submission.exercise.title,
        course: submission.exercise.chapter.course.title,
        sub: submission.exercise.chapter.title,
      }
    : {
        kind: "Examen",
        item: submission.exam?.title ?? "—",
        course: submission.exam?.course.title ?? "—",
        sub: `Examen ${submission.exam?.position ?? ""}`,
      };

  const autoScore = submission.answers
    .filter((a) => a.question.type !== QUESTION_TYPES.TEXT)
    .reduce((s, a) => s + a.pointsAwarded, 0);

  return (
    <>
      <PageHeader
        title={`Copie de ${submission.student.firstName} ${submission.student.lastName}`}
        description={`${context.kind} · ${context.item} — ${context.course}`}
        back={{ href: "/teacher/grading", label: "Corrections" }}
        action={
          submission.needsManualGrading ? (
            <Badge tone="warning">À corriger</Badge>
          ) : (
            <Badge tone="success">Corrigée</Badge>
          )
        }
      />

      <div className="max-w-3xl">
        <Card>
          <CardHeader
            title="Réponses"
            description={`Points automatiques déjà acquis : ${autoScore} / ${submission.maxScore}`}
          />
          <CardBody>
            <GradingForm
              submissionId={submission.id}
              feedback={submission.feedback}
              answers={submission.answers.map((a) => ({
                id: a.id,
                type: a.question.type,
                prompt: a.question.prompt,
                options: JSON.parse(a.question.optionsJson) as string[],
                correctAnswer: a.question.correctAnswer,
                maxPoints: a.question.points,
                value: a.value,
                isCorrect: a.isCorrect,
                pointsAwarded: a.pointsAwarded,
              }))}
            />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
