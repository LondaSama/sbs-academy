import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth";
import { buildCourseTranscript } from "@/lib/grading";
import { PageHeader } from "@/components/shell";
import {
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  MarkDisplay,
  Table,
  Td,
  Th,
} from "@/components/ui";

export const instant = false;

export default async function TeacherStudentsPage() {
  const teacher = await requireTeacher();

  const courses = await prisma.course.findMany({
    where: { teacherId: teacher.id },
    select: { id: true, title: true, programId: true },
    orderBy: { position: "asc" },
  });

  if (courses.length === 0) {
    return (
      <>
        <PageHeader title="Mes élèves" />
        <Card>
          <CardBody>
            <EmptyState
              title="Aucun élève"
              description="Créez un cours rattaché à un cycle pour voir les élèves concernés."
            />
          </CardBody>
        </Card>
      </>
    );
  }

  const programIds = [...new Set(courses.map((c) => c.programId))];

  const students = await prisma.user.findMany({
    where: {
      role: "STUDENT",
      enrollments: { some: { programId: { in: programIds } } },
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      isActive: true,
      enrollments: { select: { programId: true } },
    },
  });

  // Note de chaque élève pour chacun des cours du professeur.
  const rows = [];
  for (const student of students) {
    const studentPrograms = new Set(student.enrollments.map((e) => e.programId));
    const marks: { courseTitle: string; mark: number | null }[] = [];

    for (const course of courses) {
      if (!studentPrograms.has(course.programId)) continue;
      const t = await buildCourseTranscript(student.id, course.id);
      marks.push({ courseTitle: course.title, mark: t?.finalMark ?? null });
    }

    const valid = marks
      .map((m) => m.mark)
      .filter((m): m is number => m !== null);
    const average =
      valid.length > 0
        ? Math.round((valid.reduce((a, b) => a + b, 0) / valid.length) * 100) /
          100
        : null;

    rows.push({ student, marks, average });
  }

  return (
    <>
      <PageHeader
        title="Mes élèves"
        description={`${students.length} élève(s) inscrit(s) aux cycles de vos cours.`}
      />

      <Card>
        <CardHeader
          title="Résultats par cours"
          description="Note finale = exercices de chapitre (40 %) + examens (60 %)."
        />
        {rows.length === 0 ? (
          <CardBody>
            <EmptyState
              title="Aucun élève inscrit"
              description="Demandez à l'administration d'inscrire des élèves au cycle."
            />
          </CardBody>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Élève</Th>
                {courses.map((c) => (
                  <Th key={c.id}>{c.title}</Th>
                ))}
                <Th>Moyenne</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ student, marks, average }) => (
                <tr key={student.id} className="hover:bg-navy-50/50">
                  <Td>
                    <div className="font-medium text-navy-900">
                      {student.lastName} {student.firstName}
                    </div>
                    <div className="text-xs text-navy-400">{student.email}</div>
                  </Td>
                  {courses.map((course) => {
                    const entry = marks.find(
                      (m) => m.courseTitle === course.title,
                    );
                    return (
                      <Td key={course.id}>
                        {entry ? (
                          <MarkDisplay mark={entry.mark} />
                        ) : (
                          <span className="text-xs text-navy-300">
                            non inscrit
                          </span>
                        )}
                      </Td>
                    );
                  })}
                  <Td>
                    <MarkDisplay mark={average} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <p className="mt-4 text-xs text-navy-400">
        Pour modifier un accès élève,{" "}
        <Link href="/teacher" className="underline">
          contactez l&apos;administration
        </Link>{" "}
        : seul l&apos;administrateur peut créer ou révoquer un compte.
      </p>
    </>
  );
}
