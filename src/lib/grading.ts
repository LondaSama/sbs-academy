import "server-only";

import { prisma } from "@/lib/prisma";
import { EXAM_WEIGHT, EXERCISE_WEIGHT, QUESTION_TYPES } from "@/lib/constants";

export type QuestionForGrading = {
  id: string;
  type: string;
  correctAnswer: string | null;
  points: number;
};

export type GradedAnswer = {
  questionId: string;
  value: string;
  isCorrect: boolean | null;
  pointsAwarded: number;
};

/**
 * Corrige automatiquement ce qui peut l'être.
 * Oui/Non et QCM sont corrigés immédiatement ; les réponses rédigées
 * restent à 0 point et sont marquées "à corriger" pour le professeur.
 */
export function autoGrade(
  questions: QuestionForGrading[],
  rawAnswers: Record<string, string>,
): {
  answers: GradedAnswer[];
  score: number;
  maxScore: number;
  needsManualGrading: boolean;
} {
  const answers: GradedAnswer[] = [];
  let score = 0;
  let maxScore = 0;
  let needsManualGrading = false;

  for (const question of questions) {
    const value = (rawAnswers[question.id] ?? "").trim();
    maxScore += question.points;

    if (question.type === QUESTION_TYPES.TEXT) {
      // Correction manuelle par le professeur.
      needsManualGrading = true;
      answers.push({
        questionId: question.id,
        value,
        isCorrect: null,
        pointsAwarded: 0,
      });
      continue;
    }

    const expected = (question.correctAnswer ?? "").trim();
    const isCorrect =
      expected.length > 0 &&
      value.length > 0 &&
      value.toLowerCase() === expected.toLowerCase();

    const pointsAwarded = isCorrect ? question.points : 0;
    score += pointsAwarded;

    answers.push({
      questionId: question.id,
      value,
      isCorrect,
      pointsAwarded,
    });
  }

  return { answers, score, maxScore, needsManualGrading };
}

/** Convertit un score brut en note sur 20. */
export function toTwenty(score: number, maxScore: number): number | null {
  if (maxScore <= 0) return null;
  return Math.round((score / maxScore) * 20 * 100) / 100;
}

export type CourseTranscript = {
  courseId: string;
  courseTitle: string;
  exercises: {
    title: string;
    chapterTitle: string;
    score: number;
    maxScore: number;
    mark: number | null;
    pending: boolean;
  }[];
  exams: {
    title: string;
    position: number;
    score: number;
    maxScore: number;
    mark: number | null;
    pending: boolean;
  }[];
  exerciseAverage: number | null;
  examAverage: number | null;
  finalMark: number | null;
};

/**
 * Construit le relevé de notes d'un élève pour un cours.
 * Note finale = moyenne des exercices de chapitre (40 %) + moyenne des examens (60 %).
 * Si l'un des deux blocs est vide, l'autre compte pour 100 %.
 */
export async function buildCourseTranscript(
  studentId: string,
  courseId: string,
): Promise<CourseTranscript | null> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      chapters: {
        orderBy: { position: "asc" },
        select: {
          title: true,
          exercise: {
            select: {
              id: true,
              title: true,
              submissions: {
                where: { studentId },
                select: {
                  score: true,
                  maxScore: true,
                  needsManualGrading: true,
                  status: true,
                },
              },
            },
          },
        },
      },
      exams: {
        orderBy: { position: "asc" },
        select: {
          id: true,
          title: true,
          position: true,
          submissions: {
            where: { studentId },
            select: {
              score: true,
              maxScore: true,
              needsManualGrading: true,
              status: true,
            },
          },
        },
      },
    },
  });

  if (!course) return null;

  const exercises: CourseTranscript["exercises"] = [];
  for (const chapter of course.chapters) {
    if (!chapter.exercise) continue;
    const submission = chapter.exercise.submissions[0];
    if (!submission) continue;

    exercises.push({
      title: chapter.exercise.title,
      chapterTitle: chapter.title,
      score: submission.score,
      maxScore: submission.maxScore,
      mark: toTwenty(submission.score, submission.maxScore),
      pending: submission.needsManualGrading,
    });
  }

  const exams: CourseTranscript["exams"] = [];
  for (const exam of course.exams) {
    const submission = exam.submissions[0];
    if (!submission) continue;

    exams.push({
      title: exam.title,
      position: exam.position,
      score: submission.score,
      maxScore: submission.maxScore,
      mark: toTwenty(submission.score, submission.maxScore),
      pending: submission.needsManualGrading,
    });
  }

  const average = (marks: (number | null)[]): number | null => {
    const valid = marks.filter((m): m is number => m !== null);
    if (valid.length === 0) return null;
    const sum = valid.reduce((a, b) => a + b, 0);
    return Math.round((sum / valid.length) * 100) / 100;
  };

  const exerciseAverage = average(exercises.map((e) => e.mark));
  const examAverage = average(exams.map((e) => e.mark));

  let finalMark: number | null = null;
  if (exerciseAverage !== null && examAverage !== null) {
    finalMark =
      Math.round(
        (exerciseAverage * EXERCISE_WEIGHT + examAverage * EXAM_WEIGHT) * 100,
      ) / 100;
  } else if (exerciseAverage !== null) {
    finalMark = exerciseAverage;
  } else if (examAverage !== null) {
    finalMark = examAverage;
  }

  return {
    courseId: course.id,
    courseTitle: course.title,
    exercises,
    exams,
    exerciseAverage,
    examAverage,
    finalMark,
  };
}

/** Relevé complet d'un élève : un bloc par cours de ses cycles. */
export async function buildFullTranscript(studentId: string) {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    select: {
      program: {
        select: {
          id: true,
          name: true,
          courses: {
            where: { isPublished: true },
            orderBy: { position: "asc" },
            select: { id: true },
          },
        },
      },
    },
  });

  const programs = [];
  for (const { program } of enrollments) {
    const transcripts: CourseTranscript[] = [];
    for (const course of program.courses) {
      const t = await buildCourseTranscript(studentId, course.id);
      if (t) transcripts.push(t);
    }

    const marks = transcripts
      .map((t) => t.finalMark)
      .filter((m): m is number => m !== null);
    const programAverage =
      marks.length > 0
        ? Math.round((marks.reduce((a, b) => a + b, 0) / marks.length) * 100) /
          100
        : null;

    programs.push({
      id: program.id,
      name: program.name,
      courses: transcripts,
      average: programAverage,
    });
  }

  return programs;
}
