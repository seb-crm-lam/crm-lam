import { NextResponse } from "next/server";
import { listContactsAvecRechercheActive } from "@/lib/repo";
import { TYPE_APPORTEUR_LABELS, APPORT_CATEGORIE_LABELS } from "@/lib/format";


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
  const nomParId = new Map(contacts.map((c) => [c.id, c.prenom ? `${c.prenom} ${c.nom}` : c.nom]));

  const entetes = [
    "Nom",
    "Prénom",
    "Téléphone",
    "Email",
    "Statut",
    "Recherche active",
    "Accord réponse",
    "Consentement prospection",
    "Type d'apporteur",
    "Ce qu'il apporte",
    "Présenté par",
    "Note sur la présentation",
    "Apporté par",
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
        c.typeApporteur ? TYPE_APPORTEUR_LABELS[c.typeApporteur] ?? c.typeApporteur : "",
        c.apportCategorie ? APPORT_CATEGORIE_LABELS[c.apportCategorie] ?? c.apportCategorie : "",
        c.presenteParId ? nomParId.get(c.presenteParId) ?? "" : "",
        c.notePresentation ?? "",
        c.apporteParId ? nomParId.get(c.apporteParId) ?? "" : "",
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
