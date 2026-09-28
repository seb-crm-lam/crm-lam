"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/journee", label: "Ma journée" },
  { href: "/biens", label: "Biens" },
  { href: "/contacts", label: "Contacts" },
  { href: "/rapprochement", label: "Rapprochement" },
];

export default function Nav() {
  const pathname = usePathname();
  const estActif = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  return (
    <>
      {/* Ordinateur : colonne à gauche */}
      <nav className="hidden md:block w-56 shrink-0 border-r border-border bg-card min-h-screen py-6 px-4">
        <div className="px-2 mb-8">
          <div className="text-sm font-semibold tracking-tight">L'Adresse Marrakchie</div>
          <div className="label-sm">CRM interne</div>
        </div>
        <ul className="space-y-1">
          {ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded-lg px-3 py-2 text-sm font-medium ${
                  estActif(item.href) ? "bg-accentbg text-accent" : "text-text hover:bg-chip"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* iPhone : barre fixe en bas, à portée de pouce */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-4">
          {ITEMS.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`flex h-14 items-center justify-center px-1 text-center text-[13px] font-medium leading-tight ${
                  estActif(item.href) ? "text-accent" : "text-muted"
                }`}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
