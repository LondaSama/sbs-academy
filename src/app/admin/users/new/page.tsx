import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/shell";
import { Card, CardBody } from "@/components/ui";
import { NewUserForm } from "./new-user-form";

export const instant = false;

export default async function NewUserPage() {
  const programs = await prisma.program.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <>
      <PageHeader
        title="Créer un accès"
        description="Le mot de passe est généré automatiquement. Transmettez-le à la personne : elle devra le changer à sa première connexion."
        back={{ href: "/admin/users", label: "Accès & comptes" }}
      />

      <div className="max-w-xl">
        <Card>
          <CardBody>
            <NewUserForm programs={programs} />
          </CardBody>
        </Card>
      </div>
    </>
  );
}
