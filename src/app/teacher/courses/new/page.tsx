import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell";
import { Alert, Card, CardBody } from "@/components/ui";
import { CourseForm } from "../course-form";

export const instant = false;

export default async function NewCoursePage() {
  const programs = await prisma.program.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <>
      <PageHeader
        title="Nouveau cours"
        description="Un cours appartient à un cycle : seuls les élèves inscrits à ce cycle y auront accès."
        back={{ href: "/teacher/courses", label: "Mes cours" }}
      />

      <div className="max-w-xl">
        {programs.length === 0 ? (
          <Alert tone="warning">
            Aucun cycle n&apos;existe encore. Demandez à l&apos;administration
            d&apos;en créer un avant de pouvoir ajouter un cours.
          </Alert>
        ) : (
          <Card>
            <CardBody>
              <CourseForm programs={programs} mode="create" />
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
