import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { HOME_BY_ROLE } from "@/lib/constants";

export const instant = false;

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  redirect(HOME_BY_ROLE[user.role]);
}
