import { notFound } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth";
import { PageHeader } from "@/components/shell";
import { Badge, Card, CardBody, CardHeader } from "@/components/ui";
import { QuestionEditor } from "@/components/question-editor";
import { ChapterForm, ChapterSidebar } from "./chapter-panels";

export const instant = false;

export default async function TeacherChapterPage({
  params,
}: {
  params: Promise<{ courseId: string; chapterId: string }>;
}) {
  const { courseId, chapterId } = await params;
  const teacher = await requireTeacher();

  const chapter = await prisma.chapter.findFirst({
    where: { id: chapterId, courseId, course: { teacherId: teacher.id } },
    include: {
      course: { select: { id: true, title: true } },
      exercise: {
        include: {
          questions: { orderBy: { position: "asc" } },
          _count: { select: { submissions: true } },
        },
      },
    },
  });

  if (!chapter) notFound();

  const questions = (chapter.exercise?.questions ?? []).map((q) => ({
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
        title={`Chapitre ${chapter.position} — ${chapter.title}`}
        back={{
          href: `/teacher/courses/${courseId}`,
          label: chapter.course.title,
        }}
        action={
          questions.length === 0 ? (
            <Badge tone="warning">Exercice à compléter</Badge>
          ) : chapter.isPublished ? (
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
              title="Contenu du chapitre"
              description="Le texte lu par les élèves. Utilisez **gras**, ## titres et - listes."
            />
            <CardBody>
              <ChapterForm
                chapter={{
                  id: chapter.id,
                  title: chapter.title,
                  content: chapter.content,
                }}
              />
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Exercice de fin de chapitre"
              description="Obligatoire : il teste les élèves sur ce qu'ils viennent de lire."
              action={
                chapter.exercise ? (
                  <span className="text-sm text-navy-500">
                    {chapter.exercise._count.submissions} rendu(s)
                  </span>
                ) : null
              }
            />
            <CardBody>
              {chapter.exercise ? (
                <QuestionEditor
                  questions={questions}
                  exerciseId={chapter.exercise.id}
                />
              ) : (
                <p className="text-sm text-red-600">
                  L&apos;exercice de ce chapitre est introuvable. Supprimez puis
                  recréez le chapitre.
                </p>
              )}
            </CardBody>
          </Card>
        </div>

        <div>
          <ChapterSidebar
            chapterId={chapter.id}
            title={chapter.title}
            isPublished={chapter.isPublished}
            questionCount={questions.length}
          />
        </div>
      </div>
    </>
  );
}
