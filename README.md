# SBS Academy

Plateforme de cours en ligne de **Sport Business School**.

Trois espaces, un seul point d'entrée : l'administration crée les accès, les
professeurs construisent les cours, les élèves les suivent et reçoivent leur
relevé de notes.

---

## Les trois rôles

### Administrateur

Il chapeaute toute la plateforme.

- **Seul à créer les accès** — élèves, professeurs et autres administrateurs.
  Personne ne peut s'inscrire soi-même.
- Génère un mot de passe provisoire à transmettre ; la personne doit le changer
  à sa première connexion.
- Ouvre n'importe quel profil pour consulter la progression et les notes.
- Modifie l'identité et le rôle d'un compte, réinitialise un mot de passe,
  suspend ou supprime un accès.
- Gère les cycles (promotions) et y inscrit les élèves.
- Supervise tous les cours : publication, dépublication, suppression.

### Professeur

- Crée ses cours et les rattache à un cycle.
- Structure chaque cours en chapitres, avec un contenu rédigé.
- **Un exercice obligatoire par chapitre** : il est créé automatiquement avec le
  chapitre, et le cours ne peut pas être publié tant qu'un exercice reste vide.
- Crée jusqu'à **3 examens principaux** par cours.
- Compose les questions en trois formats : **Oui/Non**, **choix multiple**,
  **réponse rédigée**.
- Corrige les réponses rédigées et attribue les points ; le reste est corrigé
  automatiquement.
- Suit les résultats de tous ses élèves, cours par cours.

### Élève

- Se connecte uniquement avec l'accès fourni par l'administration.
- Voit les cours publiés des cycles auxquels il est inscrit.
- Lit les chapitres dans l'ordre et répond à l'exercice de fin de chapitre.
- Compose les examens (une seule tentative par examen).
- Consulte son **relevé de notes** détaillé, mis à jour automatiquement.

---

## Le calcul des notes

Chaque évaluation est ramenée sur 20.

```
Note finale d'un cours = moyenne des exercices de chapitre × 40 %
                       + moyenne des examens              × 60 %
```

Si un seul des deux blocs existe, il compte pour 100 %. La moyenne du cycle est
la moyenne des notes finales de ses cours.

Les questions Oui/Non et à choix multiple sont corrigées à l'instant où l'élève
rend sa copie. Les réponses rédigées valent 0 point tant que le professeur ne
les a pas notées : la copie apparaît alors « en correction » des deux côtés.

Les poids se règlent dans [`src/lib/constants.ts`](src/lib/constants.ts)
(`EXAM_WEIGHT`).

---

## Démarrer en local

Prérequis : **Node.js 20 ou plus**.

```bash
npm install
```

Créez un fichier `.env` à la racine :

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="une-chaine-aleatoire-de-32-caracteres-minimum"
```

Pour générer un secret solide :

```bash
openssl rand -hex 32
```

Préparez la base et les données de démonstration :

```bash
npx prisma migrate dev
npm run db:seed
```

Lancez le serveur :

```bash
npm run dev
```

L'application est sur <http://localhost:3000>.

### Comptes de démonstration

Créés par `npm run db:seed`, à usage de test uniquement.

| Rôle | Identifiant | Mot de passe |
| --- | --- | --- |
| Administrateur | `admin@sbsclass.sn` | `Admin2025!` |
| Professeur | `prof.ndiaye@sbsclass.sn` | `Prof2025!` |
| Professeur | `prof.fall@sbsclass.sn` | `Prof2025!` |
| Élève | `etudiant1@sbsclass.sn` | `Etud2025!` |
| Élève | `etudiant2@sbsclass.sn` | `Etud2025!` |
| Élève | `etudiant3@sbsclass.sn` | `Etud2025!` |

**Supprimez ou changez ces comptes avant toute mise en production.**

---

## Scripts

| Commande | Effet |
| --- | --- |
| `npm run dev` | Serveur de développement |
| `npm run build` | Build de production |
| `npm start` | Démarre le build de production |
| `npm run lint` | Analyse ESLint |
| `npm run db:seed` | (Ré)initialise les données de démonstration |
| `npm run db:reset` | Réinitialise complètement la base |
| `npm run db:studio` | Ouvre Prisma Studio |

---

## Structure

```
prisma/
  schema.prisma          Modèle de données
  seed.ts                Données de démonstration
src/
  app/
    actions/             Server actions (auth, admin, teacher, student)
    admin/               Espace administrateur
    teacher/             Espace professeur
    student/             Espace élève
    login/               Connexion
    change-password/     Changement de mot de passe imposé
  components/            Composants partagés
  lib/
    auth.ts              Sessions, hachage, garde-fous par rôle
    grading.ts           Correction automatique et relevés de notes
    constants.ts         Rôles, types de questions, pondérations
```

---

## Choix techniques

- **Next.js 16** (App Router) + **TypeScript** — rendu serveur et server actions,
  pas d'API REST séparée à maintenir.
- **Prisma 6** + **SQLite** — zéro service externe à installer. Pour la
  production, changez le `provider` en `postgresql` dans `schema.prisma` et
  pointez `DATABASE_URL` vers votre base.
- **Tailwind CSS 4** — la charte (bleu marine et or) est définie dans
  `src/app/globals.css`.
- **Sessions JWT** signées (`jose`) dans un cookie `httpOnly`, mots de passe
  hachés avec **bcrypt**.

### Sécurité

- Chaque page et chaque action serveur revérifie le rôle côté serveur :
  masquer un lien ne suffit jamais.
- Un compte suspendu perd l'accès à la requête suivante, sans attendre
  l'expiration de sa session.
- Un professeur ne peut agir que sur ses propres cours ; un élève ne voit que
  les cours publiés des cycles où il est inscrit.
- Le formulaire de connexion renvoie le même message quelle que soit la cause
  de l'échec, pour ne pas révéler quelles adresses existent.
- Le contenu des cours est rendu par React, jamais via `innerHTML`.

### Avant la mise en production

1. Remplacez SQLite par PostgreSQL.
2. Changez `AUTH_SECRET` (et ne le versionnez jamais).
3. Supprimez les comptes de démonstration.
4. Servez l'application en HTTPS : les cookies passent alors en `secure`.
