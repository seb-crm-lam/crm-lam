import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getBien, getContact } from "@/lib/repo";
import { rendreMandatHtml } from "@/lib/documents/mandat";
import { htmlVersPdf, reponseErreurPdf } from "@/lib/documents/render-pdf";
import { enregistrerPdf } from "@/lib/documents/storage";



export const dynamic = "force-dynamic";

// Génère le mandat en PDF et enregistre la trace de sa génération dans
// Document (A30 : « Sur la fiche du bien, un bouton "Créer le mandat" » —
// chaque clic crée une ligne, marquée "signé" plus tard depuis la fiche bien
// avec la date et la photo du papier).
export async function GET(_req: NextRequest, { params }: { params: { bienId: string } }) {
  const bien = getBien(params.bienId);
  if (!bien) {
    return NextResponse.json({ error: "Bien introuvable" }, { status: 404 });
  }
  const proprietaire = bien.proprietaireId ? getContact(bien.proprietaireId) : undefined;

  const html = rendreMandatHtml(bien, proprietaire);
  let pdf: Buffer;
  try {
    pdf = await htmlVersPdf(html);
  } catch (e) {
    return reponseErreurPdf(e);
  }

  const id = randomUUID();
  const nomFichier = `${new Date().toISOString().replace(/[:.]/g, "-")}-${id}.pdf`;
  const cheminRelatif = enregistrerPdf(`mandat/${bien.id}`, nomFichier, pdf);

  db.prepare(
    `INSERT INTO Document (id, typeDocument, bienId, contactId, modeleVersion, fichierPdf)
     VALUES (@id, 'mandat', @bienId, @contactId, 'V3.1', @fichierPdf)`
  ).run({
    id,
    bienId: bien.id,
    contactId: proprietaire?.id ?? null,
    fichierPdf: cheminRelatif,
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Mandat-${bien.reference}.pdf"`,
    },
  });
}
