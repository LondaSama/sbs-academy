import { requireTeacher } from "@/lib/auth";
import { Shell } from "@/components/shell";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireTeacher();
  return <Shell user={user}>{children}</Shell>;
}
