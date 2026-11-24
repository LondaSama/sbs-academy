"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth";
import { MAX_EXAMS_PER_COURSE, QUESTION_TYPES } from "@/lib/constants";

export type TeacherState = { error?: string; success?: string };

/** Vérifie que le cours appartient bien au professeur connecté. */
async function ownCourseOrThrow(courseId: string, teacherId: string) {
  const course = await prisma.course.findFirst({
    where: { id: courseId, teacherId },
  });
  if (!course) throw new Error("Cours introuvable ou non autorisé.");
  return course;
}

/* ------------------------------------------------------------------ Cours */

const courseSchema = z.object({
  title: z.string().trim().min(1, "Le titre du cours est obligatoire."),
  description: z.string().trim().optional(),
  programId: z.string().min(1, "Le cycle est obligatoire."),
});

export async function createCourseAction(
  _prev: TeacherState,
  formData: FormData,
): Promise<TeacherState> {
  const teacher = await requireTeacher();

  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    programId: formData.get("programId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const count = await prisma.course.count({ where: { teacherId: teacher.id } });

  const course = await prisma.course.create({
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      programId: parsed.data.programId,
      teacherId: teacher.id,
      position: count + 1,
    },
  });

  revalidatePath("/teacher/courses");
  redirect(`/teacher/courses/${course.id}`);
}

export async function updateCourseAction(
  _prev: TeacherState,
  formData: FormData,
): Promise<TeacherState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  await ownCourseOrThrow(courseId, teacher.id);

  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    programId: formData.get("programId"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.course.update({
    where: { id: courseId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description || null,
      programId: parsed.data.programId,
    },
  });

  revalidatePath(`/teacher/courses/${courseId}`);
  return { success: "Cours mis à jour." };
}

/**
 * Publication d'un cours.
 * Règle métier : chaque chapitre doit comporter un exercice avec au moins
 * une question avant que le cours puisse être rendu visible aux élèves.
 */
export async function toggleCoursePublishAction(
  _prev: TeacherState,
  formData: FormData,
): Promise<TeacherState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  const course = await ownCourseOrThrow(courseId, teacher.id);

  if (course.isPublished) {
    await prisma.course.update({
      where: { id: courseId },
      data: { isPublished: false },
    });
    revalidatePath(`/teacher/courses/${courseId}`);
    return { success: "Cours dépublié : il n'est plus visible par les élèves." };
  }

  const chapters = await prisma.chapter.findMany({
    where: { courseId },
    include: { exercise: { include: { _count: { select: { questions: true } } } } },
  });

  if (chapters.length === 0) {
    return { error: "Ajoutez au moins un chapitre avant de publier le cours." };
  }

  const invalid = chapters.filter(
    (c) => !c.exercise || c.exercise._count.questions === 0,
  );

  if (invalid.length > 0) {
    return {
      error: `Chaque chapitre doit se terminer par un exercice contenant au moins une question. À compléter : ${invalid
        .map((c) => `« ${c.title} »`)
        .join(", ")}.`,
    };
  }

  await prisma.course.update({
    where: { id: courseId },
    data: { isPublished: true },
  });

  revalidatePath(`/teacher/courses/${courseId}`);
  return { success: "Cours publié : les élèves du cycle y ont désormais accès." };
}

export async function deleteCourseAction(formData: FormData) {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  await ownCourseOrThrow(courseId, teacher.id);

  await prisma.course.delete({ where: { id: courseId } });

  revalidatePath("/teacher/courses");
  redirect("/teacher/courses");
}

/* -------------------------------------------------------------- Chapitres */

const chapterSchema = z.object({
  title: z.string().trim().min(1, "Le titre du chapitre est obligatoire."),
  content: z.string().default(""),
});

export async function createChapterAction(
  _prev: TeacherState,
  formData: FormData,
): Promise<TeacherState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  await ownCourseOrThrow(courseId, teacher.id);

  const parsed = chapterSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const count = await prisma.chapter.count({ where: { courseId } });

  const chapter = await prisma.chapter.create({
    data: {
      courseId,
      title: parsed.data.title,
      content: parsed.data.content,
      position: count + 1,
    },
  });

  // L'exercice de fin de chapitre est obligatoire : on le crée tout de suite,
  // le professeur n'a plus qu'à y ajouter ses questions.
  await prisma.exercise.create({
    data: {
      chapterId: chapter.id,
      title: `Exercice — ${parsed.data.title}`,
    },
  });

  revalidatePath(`/teacher/courses/${courseId}`);
  redirect(`/teacher/courses/${courseId}/chapters/${chapter.id}`);
}

export async function updateChapterAction(
  _prev: TeacherState,
  formData: FormData,
): Promise<TeacherState> {
  const teacher = await requireTeacher();
  const chapterId = String(formData.get("chapterId") ?? "");

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { course: true },
  });
  if (!chapter || chapter.course.teacherId !== teacher.id) {
    return { error: "Chapitre introuvable." };
  }

  const parsed = chapterSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await prisma.chapter.update({
    where: { id: chapterId },
    data: { title: parsed.data.title, content: parsed.data.content },
  });

  revalidatePath(`/teacher/courses/${chapter.courseId}/chapters/${chapterId}`);
  return { success: "Chapitre enregistré." };
}

export async function toggleChapterPublishAction(formData: FormData) {
  const teacher = await requireTeacher();
  const chapterId = String(formData.get("chapterId") ?? "");

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: {
      course: true,
      exercise: { include: { _count: { select: { questions: true } } } },
    },
  });
  if (!chapter || chapter.course.teacherId !== teacher.id) return;

  // On ne publie pas un chapitre dont l'exercice est vide.
  if (
    !chapter.isPublished &&
    (!chapter.exercise || chapter.exercise._count.questions === 0)
  ) {
    return;
  }

  await prisma.chapter.update({
    where: { id: chapterId },
    data: { isPublished: !chapter.isPublished },
  });

  revalidatePath(`/teacher/courses/${chapter.courseId}`);
  revalidatePath(`/teacher/courses/${chapter.courseId}/chapters/${chapterId}`);
}

export async function deleteChapterAction(formData: FormData) {
  const teacher = await requireTeacher();
  const chapterId = String(formData.get("chapterId") ?? "");

  const chapter = await prisma.chapter.findUnique({
    where: { id: chapterId },
    include: { course: true },
  });
  if (!chapter || chapter.course.teacherId !== teacher.id) return;

  await prisma.chapter.delete({ where: { id: chapterId } });

  revalidatePath(`/teacher/courses/${chapter.courseId}`);
  redirect(`/teacher/courses/${chapter.courseId}`);
}

/* ---------------------------------------------------------------- Examens */

export async function createExamAction(
  _prev: TeacherState,
  formData: FormData,
): Promise<TeacherState> {
  const teacher = await requireTeacher();
  const courseId = String(formData.get("courseId") ?? "");
  await ownCourseOrThrow(courseId, teacher.id);

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Le titre de l'examen est obligatoire." };

  const existing = await prisma.exam.findMany({
    where: { courseId },
    select: { position: true },
  });

  if (existing.length >= MAX_EXAMS_PER_COURSE) {
    return {
      error: `Un cours ne peut pas compter plus de ${MAX_EXAMS_PER_COURSE} examens principaux.`,
    };
  }

  // Première position libre entre 1 et 3.
  const taken = new Set(existing.map((e) => e.position));
  let position = 1;
  while (taken.has(position)) position += 1;

  const exam = await prisma.exam.create({
    data: {
      courseId,
      title,
      instructions: String(formData.get("instructions") ?? "").trim() || null,
      position,
    },
  });

  revalidatePath(`/teacher/courses/${courseId}`);
  redirect(`/teacher/courses/${courseId}/exams/${exam.id}`);
}

export async function updateExamAction(
  _prev: TeacherState,
  formData: FormData,
): Promise<TeacherState> {
  const teacher = await requireTeacher();
  const examId = String(formData.get("examId") ?? "");

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { course: true },
  });
  if (!exam || exam.course.teacherId !== teacher.id) {
    return { error: "Examen introuvable." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return { error: "Le titre de l'examen est obligatoire." };

  await prisma.exam.update({
    where: { id: examId },
    data: {
      title,
      instructions: String(formData.get("instructions") ?? "").trim() || null,
    },
  });

  revalidatePath(`/teacher/courses/${exam.courseId}/exams/${examId}`);
  return { success: "Examen enregistré." };
}

export async function toggleExamPublishAction(formData: FormData) {
  const teacher = await requireTeacher();
  const examId = String(formData.get("examId") ?? "");

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { course: true, _count: { select: { questions: true } } },
  });
  if (!exam || exam.course.teacherId !== teacher.id) return;
  if (!exam.isPublished && exam._count.questions === 0) return;

  await prisma.exam.update({
    where: { id: examId },
    data: { isPublished: !exam.isPublished },
  });

  revalidatePath(`/teacher/courses/${exam.courseId}`);
  revalidatePath(`/teacher/courses/${exam.courseId}/exams/${examId}`);
}

export async function deleteExamAction(formData: FormData) {
  const teacher = await requireTeacher();
  const examId = String(formData.get("examId") ?? "");

  const exam = await prisma.exam.findUnique({
    where: { id: examId },
    include: { course: true },
  });
  if (!exam || exam.course.teacherId !== teacher.id) return;

  await prisma.exam.delete({ where: { id: examId } });

  revalidatePath(`/teacher/courses/${exam.courseId}`);
  redirect(`/teacher/courses/${exam.courseId}`);
}

/* -------------------------------------------------------------- Questions */

const questionSchema = z
  .object({
    type: z.enum([
      QUESTION_TYPES.YES_NO,
      QUESTION_TYPES.MCQ,
      QUESTION_TYPES.TEXT,
    ]),
    prompt: z.string().trim().min(1, "L'énoncé de la question est obligatoire."),
    points: z.coerce.number().int().min(1, "Le barème doit être d'au moins 1 point."),
    options: z.array(z.string().trim()).default([]),
    correctAnswer: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === QUESTION_TYPES.MCQ) {
      const filled = data.options.filter((o) => o.length > 0);
      if (filled.length < 2) {
        ctx.addIssue({
          code: "custom",
          message: "Un QCM doit proposer au moins deux réponses.",
        });
      }
      const index = Number(data.correctAnswer);
      if (!Number.isInteger(index) || index < 0 || index >= filled.length) {
        ctx.addIssue({
          code: "custom",
          message: "Indiquez quelle proposition est la bonne réponse.",
        });
      }
    }
    if (data.type === QUESTION_TYPES.YES_NO) {
      if (data.correctAnswer !== "true" && data.correctAnswer !== "false") {
        ctx.addIssue({
          code: "custom",
          message: "Indiquez si la bonne réponse est « Oui » ou « Non ».",
        });
      }
    }
  });

function parseQuestionForm(formData: FormData) {
  const options = formData
    .getAll("options")
    .map((o) => String(o).trim())
    .filter((o) => o.length > 0);

  return questionSchema.safeParse({
    type: formData.get("type"),
    prompt: formData.get("prompt"),
    points: formData.get("points"),
    options,
    correctAnswer: formData.get("correctAnswer")
      ? String(formData.get("correctAnswer"))
      : undefined,
  });
}

/** Vérifie que l'exercice ou l'examen visé appartient au professeur. */
async function resolveQuestionParent(
  formData: FormData,
  teacherId: string,
): Promise<
  | { ok: true; exerciseId?: string; examId?: string; revalidate: string }
  | { ok: false; error: string }
> {
  const exerciseId = String(formData.get("exerciseId") ?? "") || undefined;
  const examId = String(formData.get("examId") ?? "") || undefined;

  if (exerciseId) {
    const exercise = await prisma.exercise.findUnique({
      where: { id: exerciseId },
      include: { chapter: { include: { course: true } } },
    });
    if (!exercise || exercise.chapter.course.teacherId !== teacherId) {
      return { ok: false, error: "Exercice introuvable." };
    }
    return {
      ok: true,
      exerciseId,
      revalidate: `/teacher/courses/${exercise.chapter.courseId}/chapters/${exercise.chapterId}`,
    };
  }

  if (examId) {
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { course: true },
    });
    if (!exam || exam.course.teacherId !== teacherId) {
      return { ok: false, error: "Examen introuvable." };
    }
    return {
      ok: true,
      examId,
      revalidate: `/teacher/courses/${exam.courseId}/exams/${examId}`,
    };
  }

  return { ok: false, error: "Destination de la question inconnue." };
}

export async function addQuestionAction(
  _prev: TeacherState,
  formData: FormData,
): Promise<TeacherState> {
  const teacher = await requireTeacher();

  const parent = await resolveQuestionParent(formData, teacher.id);
  if (!parent.ok) return { error: parent.error };

  const parsed = parseQuestionForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { type, prompt, points, options, correctAnswer } = parsed.data;

  const count = await prisma.question.count({
    where: parent.exerciseId
      ? { exerciseId: parent.exerciseId }
      : { examId: parent.examId },
  });

  await prisma.question.create({
    data: {
      exerciseId: parent.exerciseId ?? null,
      examId: parent.examId ?? null,
      type,
      prompt,
      points,
      optionsJson:
        type === QUESTION_TYPES.MCQ ? JSON.stringify(options) : "[]",
      correctAnswer: type === QUESTION_TYPES.TEXT ? null : correctAnswer ?? null,
      position: count + 1,
    },
  });

  revalidatePath(parent.revalidate);
  return { success: "Question ajoutée." };
}

export async function deleteQuestionAction(formData: FormData) {
  const teacher = await requireTeacher();
  const questionId = String(formData.get("questionId") ?? "");

  const question = await prisma.question.findUnique({
    where: { id: questionId },
    include: {
      exercise: { include: { chapter: { include: { course: true } } } },
      exam: { include: { course: true } },
    },
  });
  if (!question) return;

  const ownerId =
    question.exercise?.chapter.course.teacherId ??
    question.exam?.course.teacherId;
  if (ownerId !== teacher.id) return;

  await prisma.question.delete({ where: { id: questionId } });

  if (question.exercise) {
    revalidatePath(
      `/teacher/courses/${question.exercise.chapter.courseId}/chapters/${question.exercise.chapterId}`,
    );
  } else if (question.exam) {
    revalidatePath(
      `/teacher/courses/${question.exam.courseId}/exams/${question.examId}`,
    );
  }
}

/* ------------------------------------------------------------ Corrections */

/**
 * Correction manuelle d'une copie : le professeur attribue les points des
 * réponses rédigées, puis la copie passe au statut « corrigée ».
 */
export async function gradeSubmissionAction(
  _prev: TeacherState,
  formData: FormData,
): Promise<TeacherState> {
  const teacher = await requireTeacher();
  const submissionId = String(formData.get("submissionId") ?? "");

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: {
      answers: { include: { question: true } },
      exercise: { include: { chapter: { include: { course: true } } } },
      exam: { include: { course: true } },
    },
  });
  if (!submission) return { error: "Copie introuvable." };

  const ownerId =
    submission.exercise?.chapter.course.teacherId ??
    submission.exam?.course.teacherId;
  if (ownerId !== teacher.id) return { error: "Copie non autorisée." };

  let total = 0;

  for (const answer of submission.answers) {
    if (answer.question.type === QUESTION_TYPES.TEXT) {
      const raw = formData.get(`points_${answer.id}`);
      const awarded = Math.max(
        0,
        Math.min(answer.question.points, Number(raw ?? 0) || 0),
      );
      await prisma.answer.update({
        where: { id: answer.id },
        data: {
          pointsAwarded: awarded,
          isCorrect: awarded >= answer.question.points,
        },
      });
      total += awarded;
    } else {
      total += answer.pointsAwarded;
    }
  }

  await prisma.submission.update({
    where: { id: submissionId },
    data: {
      score: total,
      status: "GRADED",
      needsManualGrading: false,
      gradedAt: new Date(),
      gradedById: teacher.id,
      feedback: String(formData.get("feedback") ?? "").trim() || null,
    },
  });

  revalidatePath("/teacher/grading");
  redirect("/teacher/grading");
}
