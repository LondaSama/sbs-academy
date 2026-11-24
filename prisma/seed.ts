import { PrismaClient } from "../src/generated/prisma";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const hash = (plain: string) => bcrypt.hash(plain, 12);

async function main() {
  console.log("Nettoyage de la base…");
  await prisma.answer.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.question.deleteMany();
  await prisma.exercise.deleteMany();
  await prisma.exam.deleteMany();
  await prisma.chapterProgress.deleteMany();
  await prisma.chapter.deleteMany();
  await prisma.course.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.program.deleteMany();
  await prisma.user.deleteMany();

  console.log("Création des comptes…");

  const admin = await prisma.user.create({
    data: {
      email: "admin@sbsclass.sn",
      passwordHash: await hash("Admin2025!"),
      firstName: "Moussa",
      lastName: "Diop",
      role: "ADMIN",
      mustChangePassword: false,
    },
  });

  const profNdiaye = await prisma.user.create({
    data: {
      email: "prof.ndiaye@sbsclass.sn",
      passwordHash: await hash("Prof2025!"),
      firstName: "Fatou",
      lastName: "Ndiaye",
      role: "TEACHER",
      mustChangePassword: false,
    },
  });

  const profFall = await prisma.user.create({
    data: {
      email: "prof.fall@sbsclass.sn",
      passwordHash: await hash("Prof2025!"),
      firstName: "Ibrahima",
      lastName: "Fall",
      role: "TEACHER",
      mustChangePassword: false,
    },
  });

  const studentsData = [
    { email: "etudiant1@sbsclass.sn", firstName: "Aminata", lastName: "Sarr" },
    { email: "etudiant2@sbsclass.sn", firstName: "Ousmane", lastName: "Ba" },
    { email: "etudiant3@sbsclass.sn", firstName: "Mariama", lastName: "Sow" },
  ];

  const students = [];
  for (const s of studentsData) {
    students.push(
      await prisma.user.create({
        data: {
          ...s,
          passwordHash: await hash("Etud2025!"),
          role: "STUDENT",
          mustChangePassword: false,
        },
      }),
    );
  }

  console.log("Création du cycle…");
  const program = await prisma.program.create({
    data: {
      name: "Licence 1 — Sport Business",
      description:
        "Première année du cycle Licence en management du sport business.",
    },
  });

  await prisma.enrollment.createMany({
    data: students.map((s) => ({ studentId: s.id, programId: program.id })),
  });

  console.log("Création des cours…");

  // ------------------------------------------------------- Cours 1
  const course1 = await prisma.course.create({
    data: {
      title: "Marketing sportif",
      description:
        "Comprendre les leviers marketing propres à l'industrie du sport : sponsoring, billetterie, droits TV et marque employeur.",
      teacherId: profNdiaye.id,
      programId: program.id,
      isPublished: true,
      position: 1,
    },
  });

  const c1ch1 = await prisma.chapter.create({
    data: {
      courseId: course1.id,
      title: "Introduction au marketing sportif",
      position: 1,
      isPublished: true,
      content: `Le marketing sportif désigne l'ensemble des techniques marketing appliquées au secteur du sport.

Il se décline en deux grandes familles :

1. **Le marketing DU sport** — promouvoir un club, une fédération, un événement ou un athlète auprès de son public.
2. **Le marketing PAR le sport** — utiliser le sport comme vecteur de communication pour une marque extérieure au secteur.

Les quatre sources de revenus historiques d'un club professionnel sont la billetterie (*matchday*), les droits télévisuels, le sponsoring et le merchandising.

Depuis une quinzaine d'années, une cinquième source prend de l'ampleur : l'exploitation directe de la donnée et des audiences numériques.`,
    },
  });

  const c1ch2 = await prisma.chapter.create({
    data: {
      courseId: course1.id,
      title: "Le sponsoring sportif",
      position: 2,
      isPublished: true,
      content: `Le sponsoring est un échange entre un annonceur et une entité sportive : de la visibilité et de l'image contre un apport financier ou matériel.

**Les niveaux de partenariat**

- Partenaire titre (*naming*) — la marque donne son nom à l'entité ou à l'enceinte.
- Partenaire majeur — présence sur le maillot, forte exposition médiatique.
- Partenaire officiel — exclusivité sur une catégorie de produits.
- Fournisseur officiel — apport en nature principalement.

**Mesurer le retour**

On distingue la valorisation média (équivalent publicitaire de l'exposition obtenue) des indicateurs d'image : notoriété assistée, attribution, intention d'achat. Un bon contrat de sponsoring prévoit dès la signature les modalités de mesure.`,
    },
  });

  await prisma.exercise.create({
    data: {
      chapterId: c1ch1.id,
      title: "Quiz — Introduction au marketing sportif",
      instructions:
        "Vérifiez votre compréhension des notions de base vues dans ce chapitre.",
      questions: {
        create: [
          {
            type: "MCQ",
            prompt:
              "Parmi ces revenus, lequel n'appartient pas aux quatre sources historiques d'un club professionnel ?",
            optionsJson: JSON.stringify([
              "La billetterie",
              "Les droits télévisuels",
              "Les subventions d'État",
              "Le merchandising",
            ]),
            correctAnswer: "2",
            points: 2,
            position: 1,
          },
          {
            type: "YES_NO",
            prompt:
              "Le « marketing par le sport » concerne des marques extérieures au secteur sportif.",
            correctAnswer: "true",
            points: 1,
            position: 2,
          },
          {
            type: "TEXT",
            prompt:
              "En quelques lignes, expliquez la différence entre le marketing DU sport et le marketing PAR le sport, avec un exemple pour chacun.",
            points: 4,
            position: 3,
          },
        ],
      },
    },
  });

  await prisma.exercise.create({
    data: {
      chapterId: c1ch2.id,
      title: "Quiz — Le sponsoring sportif",
      instructions:
        "Trois questions sur les niveaux de partenariat et la mesure du retour.",
      questions: {
        create: [
          {
            type: "MCQ",
            prompt:
              "Comment appelle-t-on le partenariat qui donne son nom à un stade ?",
            optionsJson: JSON.stringify([
              "Le sponsoring maillot",
              "Le naming",
              "Le fournisseur officiel",
              "La licence de marque",
            ]),
            correctAnswer: "1",
            points: 2,
            position: 1,
          },
          {
            type: "YES_NO",
            prompt:
              "La valorisation média suffit à elle seule pour juger de l'efficacité d'un sponsoring.",
            correctAnswer: "false",
            points: 1,
            position: 2,
          },
          {
            type: "TEXT",
            prompt:
              "Citez trois indicateurs d'image permettant d'évaluer une opération de sponsoring et expliquez à quoi sert chacun.",
            points: 3,
            position: 3,
          },
        ],
      },
    },
  });

  await prisma.exam.create({
    data: {
      courseId: course1.id,
      title: "Fondamentaux du marketing sportif",
      instructions:
        "Examen de mi-parcours. Durée conseillée : 45 minutes. Toutes les questions sont obligatoires.",
      position: 1,
      isPublished: true,
      questions: {
        create: [
          {
            type: "MCQ",
            prompt:
              "Quelle source de revenus a connu la plus forte croissance dans le football européen depuis 2000 ?",
            optionsJson: JSON.stringify([
              "La billetterie",
              "Les droits télévisuels",
              "Le merchandising",
              "La restauration",
            ]),
            correctAnswer: "1",
            points: 3,
            position: 1,
          },
          {
            type: "YES_NO",
            prompt:
              "Un partenaire officiel bénéficie généralement d'une exclusivité sur sa catégorie de produits.",
            correctAnswer: "true",
            points: 2,
            position: 2,
          },
          {
            type: "TEXT",
            prompt:
              "Vous êtes directeur marketing d'un club de basket à Dakar. Proposez une stratégie de diversification des revenus sur trois ans, en justifiant vos priorités.",
            points: 10,
            position: 3,
          },
        ],
      },
    },
  });

  // ------------------------------------------------------- Cours 2
  const course2 = await prisma.course.create({
    data: {
      title: "Droit du sport",
      description:
        "Le cadre juridique applicable aux organisations sportives : statuts, contrats, responsabilités et régulation.",
      teacherId: profFall.id,
      programId: program.id,
      isPublished: true,
      position: 2,
    },
  });

  const c2ch1 = await prisma.chapter.create({
    data: {
      courseId: course2.id,
      title: "Les sources du droit du sport",
      position: 1,
      isPublished: true,
      content: `Le droit du sport se situe à la croisée du droit étatique et de la réglementation privée des fédérations.

**Trois niveaux de normes**

1. **Le droit étatique** — lois et règlements nationaux : code du sport, droit du travail, droit des sociétés.
2. **Le droit fédéral** — statuts et règlements des fédérations nationales et internationales, qui s'imposent aux licenciés.
3. **La lex sportiva** — l'ensemble des principes dégagés par la pratique arbitrale, notamment par le Tribunal arbitral du sport (TAS) de Lausanne.

La particularité du secteur tient à la **spécificité sportive** : les juges admettent certaines règles qui seraient contestables ailleurs (encadrement des transferts, limitation du nombre de joueurs étrangers par équipe) dès lors qu'elles sont nécessaires à l'équité de la compétition.`,
    },
  });

  await prisma.exercise.create({
    data: {
      chapterId: c2ch1.id,
      title: "Quiz — Les sources du droit du sport",
      instructions: "Contrôle de connaissances sur la hiérarchie des normes.",
      questions: {
        create: [
          {
            type: "MCQ",
            prompt: "Où siège le Tribunal arbitral du sport (TAS) ?",
            optionsJson: JSON.stringify([
              "À Paris",
              "À Lausanne",
              "À Bruxelles",
              "À Genève",
            ]),
            correctAnswer: "1",
            points: 2,
            position: 1,
          },
          {
            type: "YES_NO",
            prompt:
              "Les règlements fédéraux s'imposent aux licenciés d'une fédération.",
            correctAnswer: "true",
            points: 1,
            position: 2,
          },
          {
            type: "TEXT",
            prompt:
              "Qu'entend-on par « spécificité sportive » ? Donnez un exemple de règle qu'elle permet de justifier.",
            points: 4,
            position: 3,
          },
        ],
      },
    },
  });

  console.log("Création d'un rendu d'exemple…");

  // Aminata a déjà rendu l'exercice du premier chapitre.
  const exercise1 = await prisma.exercise.findUnique({
    where: { chapterId: c1ch1.id },
    include: { questions: { orderBy: { position: "asc" } } },
  });

  if (exercise1) {
    const [q1, q2, q3] = exercise1.questions;
    await prisma.submission.create({
      data: {
        studentId: students[0].id,
        exerciseId: exercise1.id,
        status: "SUBMITTED",
        score: 3,
        maxScore: 7,
        needsManualGrading: true,
        answers: {
          create: [
            {
              questionId: q1.id,
              value: "2",
              isCorrect: true,
              pointsAwarded: 2,
            },
            {
              questionId: q2.id,
              value: "true",
              isCorrect: true,
              pointsAwarded: 1,
            },
            {
              questionId: q3.id,
              value:
                "Le marketing du sport vise à promouvoir l'entité sportive elle-même, par exemple quand un club vend ses abonnements. Le marketing par le sport utilise le sport comme support de communication, par exemple une banque qui sponsorise un tournoi pour gagner en notoriété.",
              isCorrect: null,
              pointsAwarded: 0,
            },
          ],
        },
      },
    });

    await prisma.chapterProgress.create({
      data: { studentId: students[0].id, chapterId: c1ch1.id },
    });
  }

  console.log("\n✅ Base initialisée.\n");
  console.log("Comptes de connexion :");
  console.log("  Admin       admin@sbsclass.sn        Admin2025!");
  console.log("  Professeur  prof.ndiaye@sbsclass.sn  Prof2025!");
  console.log("  Professeur  prof.fall@sbsclass.sn    Prof2025!");
  console.log("  Élève       etudiant1@sbsclass.sn    Etud2025!");
  console.log("  Élève       etudiant2@sbsclass.sn    Etud2025!");
  console.log("  Élève       etudiant3@sbsclass.sn    Etud2025!");
  console.log(`\n(${admin.email} est le compte administrateur principal)\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
