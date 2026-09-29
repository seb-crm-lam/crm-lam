import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { cheminAbsoluDocument } from "@/lib/documents/storage";
import { getBien, getBienPhotos, getBienPrestations } from "@/lib/repo";
import { rendreFicheClientHtml, type PhotoEmbarquee } from "@/lib/documents/fiche-client";
import { htmlVersPdf, reponseErreurPdf } from "@/lib/documents/render-pdf";
import { AGENCE_WHATSAPP, CONSEILLER_PAR_DEFAUT } from "@/lib/agence";



export const dynamic = "force-dynamic";

// Fiche bien d'une page envoyée au client (décision du 24 septembre 2026).
// Générée à la demande, non archivée : c'est un document commercial, l'envoi
// lui-même est tracé dans l'historique du contact et du bien.
const TYPES_IMAGE: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function photosEmbarquees(bienId: string): PhotoEmbarquee[] {
  const resultat: PhotoEmbarquee[] = [];
  for (const photo of getBienPhotos(bienId)) {
    if (resultat.length >= 4) break;
    const cheminAbsolu = cheminAbsoluDocument(photo.cheminWeb);
    if (!cheminAbsolu || !fs.existsSync(cheminAbsolu)) continue;
    // Le HEIC n'est pas lisible par le moteur PDF : il sera converti côté
    // serveur (chaîne photo OVH, cadrage §7). En attendant, il est ignoré.
    const mime = TYPES_IMAGE[path.extname(cheminAbsolu).toLowerCase()];
    if (!mime) continue;
    const base64 = fs.readFileSync(cheminAbsolu).toString("base64");
    resultat.push({ dataUri: `data:${mime};base64,${base64}`, alt: photo.texteAlternatif ?? "" });
  }
  return resultat;
}

export async function GET(_req: NextRequest, { params }: { params: { bienId: string } }) {
  const bien = getBien(params.bienId);
  if (!bien) return NextResponse.json({ error: "Bien introuvable" }, { status: 404 });

  const html = rendreFicheClientHtml({
    bien,
    photos: photosEmbarquees(bien.id),
    prestations: getBienPrestations(bien.id),
    conseiller: bien.conseillerReferent || CONSEILLER_PAR_DEFAUT,
    whatsappAgence: AGENCE_WHATSAPP,
  });
  let pdf: Buffer;
  try {
    pdf = await htmlVersPdf(html);
  } catch (e) {
    return reponseErreurPdf(e);
  }

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${bien.reference}.pdf"`,
    },
  });
}
