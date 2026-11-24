"use client";

import { useFormStatus } from "react-dom";

import {
  enrollStudentAction,
  unenrollStudentAction,
} from "@/app/actions/admin";
import { Button, EmptyState, Select } from "@/components/ui";

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "…" : children}
    </Button>
  );
}

function RemoveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="text-xs font-medium text-red-600 transition-colors hover:text-red-800 disabled:opacity-50"
    >
      {pending ? "…" : "Retirer"}
    </button>
  );
}

export function EnrollmentManager({
  studentId,
  programs,
  enrolled,
}: {
  studentId: string;
  programs: { id: string; name: string }[];
  enrolled: { id: string; name: string }[];
}) {
  const enrolledIds = new Set(enrolled.map((e) => e.id));
  const available = programs.filter((p) => !enrolledIds.has(p.id));

  return (
    <div className="space-y-4">
      {enrolled.length === 0 ? (
        <EmptyState
          title="Aucun cycle"
          description="Cet élève n'est inscrit à aucun cycle, il ne voit donc aucun cours."
        />
      ) : (
        <ul className="divide-y divide-navy-50 rounded-lg border border-navy-100">
          {enrolled.map((program) => (
            <li
              key={program.id}
              className="flex items-center justify-between px-4 py-2.5"
            >
              <span className="text-sm font-medium text-navy-800">
                {program.name}
              </span>
              <form action={unenrollStudentAction}>
                <input type="hidden" name="studentId" value={studentId} />
                <input type="hidden" name="programId" value={program.id} />
                <RemoveButton />
              </form>
            </li>
          ))}
        </ul>
      )}

      {available.length > 0 ? (
        <form action={enrollStudentAction} className="flex items-end gap-2">
          <input type="hidden" name="studentId" value={studentId} />
          <div className="flex-1">
            <Select name="programId" defaultValue={available[0].id} required>
              {available.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <SubmitButton>Inscrire</SubmitButton>
        </form>
      ) : programs.length > 0 ? (
        <p className="text-xs text-navy-400">
          Cet élève est inscrit à tous les cycles existants.
        </p>
      ) : (
        <p className="text-xs text-navy-400">
          Aucun cycle n&apos;a encore été créé.
        </p>
      )}
    </div>
  );
}
