export const ROLES = {
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  STUDENT: "STUDENT",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrateur",
  TEACHER: "Professeur",
  STUDENT: "Élève",
};

export const QUESTION_TYPES = {
  YES_NO: "YES_NO",
  MCQ: "MCQ",
  TEXT: "TEXT",
} as const;

export type QuestionType = (typeof QUESTION_TYPES)[keyof typeof QUESTION_TYPES];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  YES_NO: "Oui / Non",
  MCQ: "Choix multiple",
  TEXT: "Réponse rédigée",
};

/** Nombre maximum d'examens principaux par cours. */
export const MAX_EXAMS_PER_COURSE = 3;

/** Poids du bloc examens dans la note finale (le reste vient des exercices). */
export const EXAM_WEIGHT = 0.6;
export const EXERCISE_WEIGHT = 1 - EXAM_WEIGHT;

export const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN: "/admin",
  TEACHER: "/teacher",
  STUDENT: "/student",
};
