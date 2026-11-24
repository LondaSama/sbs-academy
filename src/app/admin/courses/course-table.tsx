"use client";

import Link from "next/link";
import { useFormStatus } from "react-dom";

import {
  deleteCourseAsAdminAction,
  toggleCoursePublishAsAdminAction,
} from "@/app/actions/admin";
import { Badge, Table, Td, Th } from "@/components/ui";

function LinkButton({
  children,
  tone = "navy",
}: {
  children: React.ReactNode;
  tone?: "navy" | "red";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={[
        "text-xs font-medium transition-colors disabled:opacity-50",
        tone === "red"
          ? "text-red-600 hover:text-red-800"
          : "text-navy-600 hover:text-navy-900",
      ].join(" ")}
    >
      {pending ? "…" : children}
    </button>
  );
}

export function AdminCourseTable({
  courses,
}: {
  courses: {
    id: string;
    title: string;
    program: string;
    teacherId: string;
    teacherName: string;
    chapters: number;
    exams: number;
    isPublished: boolean;
  }[];
}) {
  return (
    <Table>
      <thead>
        <tr>
          <Th>Cours</Th>
          <Th>Professeur</Th>
          <Th>Cycle</Th>
          <Th>Contenu</Th>
          <Th>Statut</Th>
          <Th>Actions</Th>
        </tr>
      </thead>
      <tbody>
        {courses.map((c) => (
          <tr key={c.id} className="hover:bg-navy-50/50">
            <Td>
              <Link
                href={`/admin/courses/${c.id}`}
                className="font-medium text-navy-900 hover:text-navy-600"
              >
                {c.title}
              </Link>
            </Td>
            <Td>
              <Link
                href={`/admin/users/${c.teacherId}`}
                className="text-sm text-navy-600 hover:text-navy-900"
              >
                {c.teacherName}
              </Link>
            </Td>
            <Td className="text-sm text-navy-500">{c.program}</Td>
            <Td className="text-sm text-navy-500">
              {c.chapters} chapitre{c.chapters > 1 ? "s" : ""} · {c.exams}/3
              examen{c.exams > 1 ? "s" : ""}
            </Td>
            <Td>
              {c.isPublished ? (
                <Badge tone="success">Publié</Badge>
              ) : (
                <Badge tone="warning">Brouillon</Badge>
              )}
            </Td>
            <Td>
              <div className="flex items-center gap-3">
                <form action={toggleCoursePublishAsAdminAction}>
                  <input type="hidden" name="courseId" value={c.id} />
                  <LinkButton>
                    {c.isPublished ? "Dépublier" : "Publier"}
                  </LinkButton>
                </form>
                <form
                  action={deleteCourseAsAdminAction}
                  onSubmit={(e) => {
                    if (
                      !window.confirm(
                        `Supprimer le cours « ${c.title} » ? Ses chapitres, exercices, examens et toutes les notes seront perdus.`,
                      )
                    ) {
                      e.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="courseId" value={c.id} />
                  <LinkButton tone="red">Supprimer</LinkButton>
                </form>
              </div>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}
