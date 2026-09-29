import { NextRequest, NextResponse } from "next/server";
import { getBonVisite, getBonVisiteLignes, getContact } from "@/lib/repo";
import { rendreBonVisiteHtml } from "@/lib/documents/bon-visite";
import { htmlVersPdf, reponseErreurPdf } from "@/lib/documents/render-pdf";
import { enregistrerPdf } from "@/lib/documents/storage";
import { randomUUID } from "crypto";



export const dynamic = "force-dynamic";

// Génère le PDF d'un bon de visite déjà créé en base (via creerBonVisite) —
// le PDF est donc toujours le reflet exact de ce qui est enregistré, jamais
// d'une sélection de biens saisie à part.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const bonVisite = getBonVisite(params.id);
  if (!bonVisite) {
    return NextResponse.json({ error: "Bon de visite introuvable" }, { status: 404 });
  }
  const visiteur = getContact(bonVisite.contactId);
  if (!visiteur) {
    return NextResponse.json({ error: "Visiteur introuvable" }, { status: 404 });
  }
  const lignes = getBonVisiteLignes(bonVisite.id);
  const biens = lignes.map((l) => l.bien);

  const html = rendreBonVisiteHtml(visiteur, biens);
  let pdf: Buffer;
  try {
    pdf = await htmlVersPdf(html);
  } catch (e) {
    return reponseErreurPdf(e);
  }

  const nomFichier = `${new Date().toISOString().replace(/[:.]/g, "-")}-${randomUUID()}.pdf`;
  enregistrerPdf(`bon-visite/${bonVisite.id}`, nomFichier, pdf);

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${bonVisite.reference}.pdf"`,
    },
  });
}
