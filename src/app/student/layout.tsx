import { requireStudent } from "@/lib/auth";
import { Shell } from "@/components/shell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStudent();
  return <Shell user={user}>{children}</Shell>;
}
