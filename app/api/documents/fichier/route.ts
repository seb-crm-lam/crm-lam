import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { cheminAbsoluDocument } from "@/lib/documents/storage";

// Sert les fichiers stockés sous data/documents/ (photos de biens, photos de
// signatures, PDF) — ce dossier est hors de public/ donc non servi
// statiquement par Next. Cette route ne sert jamais rien en dehors de
// data/documents/ (protection contre la traversée de chemin).

const TYPES_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".pdf": "application/pdf",
};

export async function GET(request: NextRequest) {
  const chemin = request.nextUrl.searchParams.get("chemin");
  if (!chemin) return NextResponse.json({ error: "chemin manquant" }, { status: 400 });

  const cheminAbsolu = cheminAbsoluDocument(chemin);
  if (!cheminAbsolu) {
    return NextResponse.json({ error: "chemin invalide" }, { status: 400 });
  }
  if (!fs.existsSync(cheminAbsolu)) {
    return NextResponse.json({ error: "introuvable" }, { status: 404 });
  }

  const extension = path.extname(cheminAbsolu).toLowerCase();
  const contentType = TYPES_MIME[extension] ?? "application/octet-stream";
  const contenu = fs.readFileSync(cheminAbsolu);
  return new NextResponse(contenu, { headers: { "Content-Type": contentType } });
}
