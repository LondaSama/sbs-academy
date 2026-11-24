import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth";
import { PageHeader } from "@/components/shell";
import { Badge, Card, CardBody, CardHeader } from "@/components/ui";
import { QuestionEditor } from "@/components/question-editor";
import { ExamForm, ExamSidebar } from "./exam-panels";

export const instant = false;

export default async function TeacherExamPage({
  params,
}: {
  params: Promise<{ courseId: string; examId: string }>;
}) {
  const { courseId, examId } = await params;
  const teacher = await requireTeacher();

  const exam = await prisma.exam.findFirst({
    where: { id: examId, courseId, course: { teacherId: teacher.id } },
    include: {
      course: { select: { id: true, title: true } },
      questions: { orderBy: { position: "asc" } },
      _count: { select: { submissions: true } },
    },
  });

  if (!exam) notFound();

  const questions = exam.questions.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options: JSON.parse(q.optionsJson) as string[],
    correctAnswer: q.correctAnswer,
    points: q.points,
    position: q.position,
  }));

  return (
    <>
      <PageHeader
        title={`Examen ${exam.position} — ${exam.title}`}
        description="Les examens principaux comptent pour 60 % de la note finale du cours."
        back={{
          href: `/teacher/courses/${courseId}`,
          label: exam.course.title,
        }}
        action={
          questions.length === 0 ? (
            <Badge tone="warning">À compléter</Badge>
          ) : exam.isPublished ? (
            <Badge tone="success">Publié</Badge>
          ) : (
            <Badge tone="neutral">Brouillon</Badge>
          )
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader
              title="Questions de l'examen"
              action={
                <span className="text-sm text-navy-500">
                  {exam._count.submissions} copie(s)
                </span>
              }
            />
            <CardBody>
              <QuestionEditor questions={questions} examId={exam.id} />
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Réglages" />
            <CardBody>
              <ExamForm
                exam={{
                  id: exam.id,
                  title: exam.title,
                  instructions: exam.instructions,
                }}
              />
            </CardBody>
          </Card>

          <ExamSidebar
            examId={exam.id}
            title={exam.title}
            isPublished={exam.isPublished}
            questionCount={questions.length}
          />
        </div>
      </div>
    </>
  );
}
