"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { seDeconnecter } from "@/lib/auth/actions";

const ITEMS = [
  { href: "/journee", label: "Ma journée" },
  { href: "/biens", label: "Biens" },
  { href: "/contacts", label: "Contacts" },
  { href: "/rapprochement", label: "Rapprochement" },
];

export default function Nav() {
  const pathname = usePathname();
  const estActif = (href: string) => pathname === href || pathname?.startsWith(href + "/");

  // Pas de navigation sur les pages de connexion et de création du compte.
  if (pathname === "/connexion" || pathname === "/installation") return null;

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
        <form action={seDeconnecter} className="mt-8 px-1">
          <button type="submit" className="w-full rounded-lg px-3 py-2 text-left text-sm text-muted hover:bg-chip">
            Se déconnecter
          </button>
        </form>
      </nav>

      {/* iPhone : barre fixe en bas, à portée de pouce */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <ul className="grid grid-cols-5">
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
          <li>
            <form action={seDeconnecter}>
              <button
                type="submit"
                className="flex h-14 w-full items-center justify-center px-1 text-center text-[13px] font-medium leading-tight text-muted"
              >
                Quitter
              </button>
            </form>
          </li>
        </ul>
      </nav>
    </>
  );
}
