"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function NavLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  // Le lien racine d'un espace ne doit pas rester actif sur les sous-pages.
  const segments = href.split("/").filter(Boolean);
  const isRoot = segments.length === 1;
  const active = isRoot ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={[
        "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-navy-100 text-navy-900"
          : "text-navy-500 hover:bg-navy-50 hover:text-navy-800",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}
