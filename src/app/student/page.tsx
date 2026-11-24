import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireStudent } from "@/lib/auth";
import { PageHeader } from "@/components/shell";
import { Badge, Card, CardBody, EmptyState } from "@/components/ui";

export const instant = false;

export default async function StudentDashboard() {
  const student = await requireStudent();

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: student.id },
    include: {
      program: {
        include: {
          courses: {
            where: { isPublished: true },
            orderBy: { position: "asc" },
            include: {
              teacher: { select: { firstName: true, lastName: true } },
              chapters: {
                where: { isPublished: true },
                select: {
                  id: true,
                  progress: { where: { studentId: student.id }, select: { id: true } },
                },
              },
              exams: {
                where: { isPublished: true },
                select: {
                  id: true,
                  submissions: {
                    where: { studentId: student.id },
                    select: { id: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const hasCourses = enrollments.some((e) => e.program.courses.length > 0);

  return (
    <>
      <PageHeader
        title={`Bonjour ${student.firstName}`}
        description="Reprenez vos cours là où vous les avez laissés."
      />

      {enrollments.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title="Aucun cycle"
              description="Vous n'êtes inscrit à aucun cycle pour le moment. Contactez le secrétariat de SBS Academy."
            />
          </CardBody>
        </Card>
      ) : !hasCourses ? (
        <Card>
          <CardBody>
            <EmptyState
              title="Aucun cours disponible"
              description="Vos professeurs n'ont pas encore publié de cours. Revenez bientôt."
            />
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-8">
          {enrollments.map(({ program }) => (
            <section key={program.id}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-navy-400">
                {program.name}
              </h2>

              {program.courses.length === 0 ? (
                <Card>
                  <CardBody>
                    <p className="text-sm text-navy-500">
                      Aucun cours publié dans ce cycle pour le moment.
                    </p>
                  </CardBody>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {program.courses.map((course) => {
                    const total = course.chapters.length;
                    const done = course.chapters.filter(
                      (c) => c.progress.length > 0,
                    ).length;
                    const percent =
                      total > 0 ? Math.round((done / total) * 100) : 0;
                    const examsDone = course.exams.filter(
                      (e) => e.submissions.length > 0,
                    ).length;

                    return (
                      <Link
                        key={course.id}
                        href={`/student/courses/${course.id}`}
                        className="group flex flex-col rounded-xl border border-navy-100 bg-white p-5 shadow-sm transition-all hover:border-navy-300 hover:shadow-md"
                      >
                        <div className="flex-1">
                          <h3 className="font-semibold text-navy-900 group-hover:text-navy-700">
                            {course.title}
                          </h3>
                          <p className="mt-1 text-xs text-navy-400">
                            {course.teacher.firstName} {course.teacher.lastName}
                          </p>
                          {course.description ? (
                            <p className="mt-2 line-clamp-2 text-sm text-navy-500">
                              {course.description}
                            </p>
                          ) : null}
                        </div>

                        <div className="mt-4">
                          <div className="mb-1.5 flex items-center justify-between text-xs">
                            <span className="text-navy-500">
                              {done}/{total} chapitre{total > 1 ? "s" : ""}
                            </span>
                            <span className="font-medium text-navy-700">
                              {percent} %
                            </span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-navy-100">
                            <div
                              className="h-full rounded-full bg-navy-700 transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          {course.exams.length > 0 ? (
                            <div className="mt-3">
                              <Badge
                                tone={
                                  examsDone === course.exams.length
                                    ? "success"
                                    : "info"
                                }
                              >
                                {examsDone}/{course.exams.length} examen
                                {course.exams.length > 1 ? "s" : ""} rendu
                                {examsDone > 1 ? "s" : ""}
                              </Badge>
                            </div>
                          ) : null}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
