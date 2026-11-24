import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth";
import { PageHeader } from "@/components/shell";
import { Alert, Card, CardBody, CardHeader } from "@/components/ui";
import { AnswerForm } from "@/components/answer-form";

export const instant = false;

export default async function StudentExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  const student = await requireStudent();

  const exam = await prisma.exam.findFirst({
    where: {
      id: examId,
      isPublished: true,
      course: {
        isPublished: true,
        program: { enrollments: { some: { studentId: student.id } } },
      },
    },
    include: {
      course: { select: { id: true, title: true } },
      questions: { orderBy: { position: "asc" } },
      submissions: {
        where: { studentId: student.id },
        select: { id: true },
      },
    },
  });

  if (!exam) notFound();

  // Un examen ne se compose qu'une fois.
  if (exam.submissions.length > 0) {
    redirect(`/student/courses/${exam.courseId}?examen=rendu`);
  }

  return (
    <>
      <PageHeader
        title={`Examen ${exam.position} — ${exam.title}`}
        description={exam.course.title}
        back={{
          href: `/student/courses/${exam.courseId}`,
          label: exam.course.title,
        }}
      />

      <div className="max-w-3xl space-y-6">
        {exam.instructions ? (
          <Alert tone="info">
            <span className="whitespace-pre-wrap">{exam.instructions}</span>
          </Alert>
        ) : null}

        <Card>
          <CardHeader
            title="Sujet"
            description="Répondez à toutes les questions, puis envoyez votre copie."
          />
          <CardBody>
            {exam.questions.length === 0 ? (
              <p className="text-sm text-navy-500">
                Cet examen ne contient aucune question pour le moment.
              </p>
            ) : (
              <AnswerForm
                questions={exam.questions.map((q) => ({
                  id: q.id,
                  type: q.type,
                  prompt: q.prompt,
                  options: JSON.parse(q.optionsJson) as string[],
                  points: q.points,
                }))}
                examId={exam.id}
                submitLabel="Rendre ma copie"
              />
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
