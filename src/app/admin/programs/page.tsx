import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell";
import { Card, CardBody, CardHeader, EmptyState } from "@/components/ui";
import { ProgramList, NewProgramForm } from "./program-forms";

export const instant = false;

export default async function AdminProgramsPage() {
  const programs = await prisma.program.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { enrollments: true, courses: true } },
    },
  });

  return (
    <>
      <PageHeader
        title="Cycles"
        description="Un cycle regroupe des élèves et les cours qui leur sont destinés."
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Cycles existants"
            description={`${programs.length} cycle${programs.length > 1 ? "s" : ""} enregistré${programs.length > 1 ? "s" : ""}.`}
          />
          {programs.length === 0 ? (
            <CardBody>
              <EmptyState
                title="Aucun cycle"
                description="Créez un premier cycle pour pouvoir y rattacher des élèves et des cours."
              />
            </CardBody>
          ) : (
            <ProgramList
              programs={programs.map((p) => ({
                id: p.id,
                name: p.name,
                description: p.description,
                students: p._count.enrollments,
                courses: p._count.courses,
              }))}
            />
          )}
        </Card>

        <Card>
          <CardHeader title="Nouveau cycle" />
          <CardBody>
            <NewProgramForm />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
