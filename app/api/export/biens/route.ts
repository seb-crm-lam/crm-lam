import { NextResponse } from "next/server";
import { listBiens } from "@/lib/repo";
import {
  TYPE_BIEN_LABELS,
  TRANSACTION_LABELS,
  DIFFUSION_LABELS,
  STATUT_COMMERCIAL_LABELS,
} from "@/lib/format";


// Données lues à chaque affichage (sinon la page serait figée au moment de la construction).
export const dynamic = "force-dynamic";

function csvEchapper(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[;"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// Export CSV permanent de la liste des biens — cadrage : « le CRM est la
// source de vérité », un export en un clic sert de sauvegarde/partage sans
// dépendre de la disponibilité du CRM.
export async function GET() {
  const biens = listBiens();

  const entetes = [
    "Référence",
    "Titre",
    "Type",
    "Transaction",
    "Quartier",
    "Statut juridique",
    "Surface sol (m²)",
    "Surface habitable (m²)",
    "Chambres",
    "SDB",
    "Prix (DH)",
    "Prix sur demande",
    "Diffusion",
    "Statut commercial",
    "Conseiller référent",
    "Créé le",
  ];

  const lignes = [entetes.join(";")];
  for (const b of biens) {
    lignes.push(
      [
        b.reference,
        b.titre,
        TYPE_BIEN_LABELS[b.typeBien] ?? b.typeBien,
        TRANSACTION_LABELS[b.transaction] ?? b.transaction,
        b.quartierNom ?? "",
        b.statutJuridique ?? "",
        b.surfaceSol ?? "",
        b.surfaceHabitable ?? "",
        b.chambres ?? "",
        b.sallesBain ?? "",
        b.prixSurDemande ? "" : (b.prixVente ?? ""),
        b.prixSurDemande ? "Oui" : "Non",
        DIFFUSION_LABELS[b.diffusionEtat] ?? b.diffusionEtat,
        STATUT_COMMERCIAL_LABELS[b.statutCommercial] ?? b.statutCommercial,
        b.conseillerReferent ?? "",
        b.createdAt,
      ]
        .map(csvEchapper)
        .join(";")
    );
  }

  const csv = "﻿" + lignes.join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="biens_${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
