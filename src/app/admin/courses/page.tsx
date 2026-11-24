import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell";
import { Card, CardBody, EmptyState } from "@/components/ui";
import { AdminCourseTable } from "./course-table";

export const instant = false;

export default async function AdminCoursesPage() {
  const courses = await prisma.course.findMany({
    orderBy: [{ programId: "asc" }, { position: "asc" }],
    include: {
      teacher: { select: { id: true, firstName: true, lastName: true } },
      program: { select: { name: true } },
      _count: { select: { chapters: true, exams: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Cours"
        description="Supervision de l'ensemble des cours créés par les professeurs."
      />

      <Card>
        {courses.length === 0 ? (
          <CardBody>
            <EmptyState
              title="Aucun cours"
              description="Les professeurs n'ont pas encore créé de cours."
              action={
                <Link
                  href="/admin/users?role=TEACHER"
                  className="text-sm font-medium text-navy-600 hover:text-navy-900"
                >
                  Voir les professeurs
                </Link>
              }
            />
          </CardBody>
        ) : (
          <AdminCourseTable
            courses={courses.map((c) => ({
              id: c.id,
              title: c.title,
              program: c.program.name,
              teacherId: c.teacher.id,
              teacherName: `${c.teacher.firstName} ${c.teacher.lastName}`,
              chapters: c._count.chapters,
              exams: c._count.exams,
              isPublished: c.isPublished,
            }))}
          />
        )}
      </Card>
    </>
  );
}
