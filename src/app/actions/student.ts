"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth";
import { autoGrade } from "@/lib/grading";

export type StudentState = { error?: string; success?: string };

/** Vrai si l'élève est inscrit au cycle auquel le cours appartient. */
async function studentCanAccessCourse(studentId: string, courseId: string) {
  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      isPublished: true,
      program: { enrollments: { some: { studentId } } },
    },
    select: { id: true },
  });
  return Boolean(course);
}

/** Récupère les réponses du formulaire sous la forme { questionId: valeur }. */
function collectAnswers(formData: FormData): Record<string, string> {
  const answers: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("q_")) {
      answers[key.slice(2)] = String(value);
    }
  }
  return answers;
}

export async function markChapterReadAction(formData: FormData) {
  const student = await requireStudent();
  const chapterId = String(formData.get("chapterId") ?? "");

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    select: { courseId: true },
  });
  if (!chapter) return;
  if (!(await studentCanAccessCourse(student.id, chapter.courseId))) return;

  await prisma.chapterProgress.upsert({
    where: { studentId_chapterId: { studentId: student.id, chapterId } },
    create: { studentId: student.id, chapterId },
    update: {},
  });

  revalidatePath(`/student/courses/${chapter.courseId}`);
  revalidatePath(`/student/courses/${chapter.courseId}/chapters/${chapterId}`);
}

export async function submitExerciseAction(
  _prev: StudentState,
  formData: FormData,
): Promise<StudentState> {
  const student = await requireStudent();
  const exerciseId = String(formData.get("exerciseId") ?? "");

  const exercise = await prisma.exercise.findUnique({
    where: { id: exerciseId },
    include: {
      questions: { orderBy: { position: "asc" } },
      chapter: { select: { id: true, courseId: true, isPublished: true } },
    },
  });

  if (!exercise || !exercise.chapter.isPublished) {
    return { error: "Cet exercice n'est pas disponible." };
  }
  if (!(await studentCanAccessCourse(student.id, exercise.chapter.courseId))) {
    return { error: "Vous n'avez pas accès à ce cours." };
  }

  const already = await prisma.submission.findUnique({
    where: {
      studentId_exerciseId: { studentId: student.id, exerciseId },
    },
  });
  if (already) {
    return { error: "Vous avez déjà rendu cet exercice." };
  }

  const raw = collectAnswers(formData);
  const graded = autoGrade(
    exercise.questions.map((q) => ({
      id: q.id,
      type: q.type,
      correctAnswer: q.correctAnswer,
      points: q.points,
    })),
    raw,
  );

  await prisma.submission.create({
    data: {
      studentId: student.id,
      exerciseId,
      status: graded.needsManualGrading ? "SUBMITTED" : "GRADED",
      score: graded.score,
      maxScore: graded.maxScore,
      needsManualGrading: graded.needsManualGrading,
      gradedAt: graded.needsManualGrading ? null : new Date(),
      answers: { create: graded.answers },
    },
  });

  // Rendre l'exercice vaut validation du chapitre.
  await prisma.chapterProgress.upsert({
    where: {
      studentId_chapterId: {
        studentId: student.id,
        chapterId: exercise.chapter.id,
      },
    },
    create: { studentId: student.id, chapterId: exercise.chapter.id },
    update: {},
  });

  revalidatePath(`/student/courses/${exercise.chapter.courseId}`);
  revalidatePath("/student/transcript");
  redirect(
    `/student/courses/${exercise.chapter.courseId}/chapters/${exercise.chapter.id}?rendu=1`,
  );
}

export async function submitExamAction(
  _prev: StudentState,
  formData: FormData,
): Promise<StudentState> {
  const student = await requireStudent();
  const examId = String(formData.get("examId") ?? "");

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: { orderBy: { position: "asc" } } },
  });

  if (!exam || !exam.isPublished) {
    return { error: "Cet examen n'est pas ouvert." };
  }
  if (!(await studentCanAccessCourse(student.id, exam.courseId))) {
    return { error: "Vous n'avez pas accès à ce cours." };
  }

  const already = await prisma.submission.findUnique({
    where: { studentId_examId: { studentId: student.id, examId } },
  });
  if (already) {
    return { error: "Vous avez déjà rendu cet examen." };
  }

  const raw = collectAnswers(formData);
  const graded = autoGrade(
    exam.questions.map((q) => ({
      id: q.id,
      type: q.type,
      correctAnswer: q.correctAnswer,
      points: q.points,
    })),
    raw,
  );

  await prisma.submission.create({
    data: {
      studentId: student.id,
      examId,
      status: graded.needsManualGrading ? "SUBMITTED" : "GRADED",
      score: graded.score,
      maxScore: graded.maxScore,
      needsManualGrading: graded.needsManualGrading,
      gradedAt: graded.needsManualGrading ? null : new Date(),
      answers: { create: graded.answers },
    },
  });

  revalidatePath(`/student/courses/${exam.courseId}`);
  revalidatePath("/student/transcript");
  redirect(`/student/courses/${exam.courseId}?examen=rendu`);
}
