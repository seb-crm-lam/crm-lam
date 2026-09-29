import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getBien, getContact, getVisitesPourBien } from "@/lib/repo";
import { rendreCompteRenduHtml } from "@/lib/documents/compte-rendu";
import { htmlVersPdf, reponseErreurPdf } from "@/lib/documents/render-pdf";
import { enregistrerPdf } from "@/lib/documents/storage";



export const dynamic = "force-dynamic";

// Génère le PDF du compte rendu de démarches (A31, art. 6 du mandat V3.1) —
// reprend toutes les visites du bien, jamais seulement la dernière (à la
// différence du message WhatsApp, qui ne porte que sur la dernière visite).
export async function GET(_req: NextRequest, { params }: { params: { bienId: string } }) {
  const bien = getBien(params.bienId);
  if (!bien) {
    return NextResponse.json({ error: "Bien introuvable" }, { status: 404 });
  }
  const proprietaire = bien.proprietaireId ? getContact(bien.proprietaireId) : undefined;
  const visites = getVisitesPourBien(bien.id);

  const html = rendreCompteRenduHtml(bien, proprietaire, visites);
  let pdf: Buffer;
  try {
    pdf = await htmlVersPdf(html);
  } catch (e) {
    return reponseErreurPdf(e);
  }

  const id = randomUUID();
  const nomFichier = `${new Date().toISOString().replace(/[:.]/g, "-")}-${id}.pdf`;
  const cheminRelatif = enregistrerPdf(`compte-rendu/${bien.id}`, nomFichier, pdf);

  db.prepare(
    `INSERT INTO Document (id, typeDocument, bienId, contactId, fichierPdf)
     VALUES (@id, 'compte_rendu', @bienId, @contactId, @fichierPdf)`
  ).run({
    id,
    bienId: bien.id,
    contactId: proprietaire?.id ?? null,
    fichierPdf: cheminRelatif,
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Compte-rendu-${bien.reference}.pdf"`,
    },
  });
}
