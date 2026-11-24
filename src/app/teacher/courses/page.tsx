import Link from "next/link";

import { prisma } from "@/lib/prisma";
import { requireTeacher } from "@/lib/auth";
import { PageHeader } from "@/components/shell";
import {
  Badge,
  ButtonLink,
  Card,
  CardBody,
  EmptyState,
  Table,
  Td,
  Th,
} from "@/components/ui";
import { MAX_EXAMS_PER_COURSE } from "@/lib/constants";

export const instant = false;

export default async function TeacherCoursesPage() {
  const teacher = await requireTeacher();

  const courses = await prisma.course.findMany({
    where: { teacherId: teacher.id },
    orderBy: { position: "asc" },
    include: {
      program: { select: { name: true } },
      _count: { select: { chapters: true, exams: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Mes cours"
        description="Créez vos cours, structurez-les en chapitres et ajoutez les évaluations."
        action={<ButtonLink href="/teacher/courses/new">Nouveau cours</ButtonLink>}
      />

      <Card>
        {courses.length === 0 ? (
          <CardBody>
            <EmptyState
              title="Aucun cours"
              description="Votre premier cours vous attend."
              action={
                <ButtonLink href="/teacher/courses/new">
                  Créer un cours
                </ButtonLink>
              }
            />
          </CardBody>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Cours</Th>
                <Th>Cycle</Th>
                <Th>Chapitres</Th>
                <Th>Examens</Th>
                <Th>Statut</Th>
              </tr>
            </thead>
            <tbody>
              {courses.map((c) => (
                <tr key={c.id} className="hover:bg-navy-50/50">
                  <Td>
                    <Link
                      href={`/teacher/courses/${c.id}`}
                      className="font-medium text-navy-900 hover:text-navy-600"
                    >
                      {c.title}
                    </Link>
                    {c.description ? (
                      <div className="mt-0.5 max-w-md truncate text-xs text-navy-400">
                        {c.description}
                      </div>
                    ) : null}
                  </Td>
                  <Td className="text-sm text-navy-500">{c.program.name}</Td>
                  <Td className="tabular-nums">{c._count.chapters}</Td>
                  <Td className="tabular-nums">
                    {c._count.exams}/{MAX_EXAMS_PER_COURSE}
                  </Td>
                  <Td>
                    {c.isPublished ? (
                      <Badge tone="success">Publié</Badge>
                    ) : (
                      <Badge tone="warning">Brouillon</Badge>
                    )}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </>
  );
}
