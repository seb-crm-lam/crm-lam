import { NextResponse } from "next/server";
import { listContactsAvecRechercheActive } from "@/lib/repo";


// Données lues à chaque affichage (sinon la page serait figée au moment de la construction).
export const dynamic = "force-dynamic";

const STATUT_LABELS: Record<string, string> = {
  nouveau: "Nouveau",
  en_recherche: "En recherche",
  abouti: "Abouti",
  perdu: "Perdu",
};

function csvEchapper(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Export CSV permanent de la liste des contacts.
export async function GET() {
  const contacts = listContactsAvecRechercheActive();

  const entetes = [
    "Nom",
    "Prénom",
    "Téléphone",
    "Email",
    "Statut",
    "Recherche active",
    "Accord réponse",
    "Consentement prospection",
    "Dernier contact",
  ];

  const lignes = [entetes.join(";")];
  for (const c of contacts) {
    lignes.push(
      [
        c.nom,
        c.prenom ?? "",
        c.telephone ?? "",
        c.email ?? "",
        STATUT_LABELS[c.statut] ?? c.statut,
        c.rechercheActive ? "Oui" : "Non",
        c.accordReponse ? "Oui" : "Non",
        c.consentementProspection ? "Oui" : "Non",
        c.dateDernierContact ?? "",
      ]
        .map(csvEchapper)
        .join(";")
    );
  }

  const csv = "﻿" + lignes.join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contacts_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
