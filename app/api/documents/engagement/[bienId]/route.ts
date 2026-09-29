import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { getBien, getContact } from "@/lib/repo";
import { rendreEngagementHtml } from "@/lib/documents/engagement";
import { htmlVersPdf, reponseErreurPdf } from "@/lib/documents/render-pdf";
import { enregistrerPdf } from "@/lib/documents/storage";
import { CONSEILLER_PAR_DEFAUT } from "@/lib/agence";



export const dynamic = "force-dynamic";

// Engagement de confidentialité (fonds de commerce) — même mécanique que le
// mandat (A30) : PDF prérempli, trace dans Document, « marquer signé » sur la
// fiche du bien. Paramètres : contactId (candidat), taux (article 5).
export async function GET(req: NextRequest, { params }: { params: { bienId: string } }) {
  const bien = getBien(params.bienId);
  if (!bien) return NextResponse.json({ error: "Bien introuvable" }, { status: 404 });

  const contactId = req.nextUrl.searchParams.get("contactId");
  const candidat = contactId ? getContact(contactId) : undefined;
  if (!candidat) return NextResponse.json({ error: "Candidat acquéreur introuvable" }, { status: 400 });

  const tauxBrut = req.nextUrl.searchParams.get("taux")?.replace(",", ".").trim();
  const taux = tauxBrut ? Number(tauxBrut) : null;
  const tauxValide = taux !== null && Number.isFinite(taux) ? taux : null;

  const id = randomUUID();
  const referenceCrm = `ENG-${id.slice(0, 8).toUpperCase()}`;
  const agent = bien.conseillerReferent || CONSEILLER_PAR_DEFAUT;

  const html = rendreEngagementHtml({ bien, candidat, taux: tauxValide, referenceCrm, agent, date: new Date() });
  let pdf: Buffer;
  try {
    pdf = await htmlVersPdf(html);
  } catch (e) {
    return reponseErreurPdf(e);
  }

  const nomFichier = `${new Date().toISOString().replace(/[:.]/g, "-")}-${id}.pdf`;
  const cheminRelatif = enregistrerPdf(`engagement/${bien.id}`, nomFichier, pdf);

  db.prepare(
    `INSERT INTO Document (id, typeDocument, bienId, contactId, modeleVersion, fichierPdf)
     VALUES (@id, 'engagement_confidentialite', @bienId, @contactId, 'V2', @fichierPdf)`
  ).run({ id, bienId: bien.id, contactId: candidat.id, fichierPdf: cheminRelatif });

  db.prepare(
    `INSERT INTO Evenement (id, contactId, bienId, typeEvenement, detail)
     VALUES (@id, @contactId, @bienId, 'engagement_confidentialite_genere', @detail)`
  ).run({ id: randomUUID(), contactId: candidat.id, bienId: bien.id, detail: `${referenceCrm} — ${bien.reference}` });

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="Engagement-${bien.reference}-${referenceCrm}.pdf"`,
    },
  });
}
