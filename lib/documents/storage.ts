// Stockage local des fichiers du prototype (PDF générés, photos de documents
// signés) — sous data/documents/. Dans le CRM de production, ces fichiers
// vivent sur l'hébergement OVHcloud existant (cadrage §7 : « photos vivent
// sur l'hébergement OVHcloud existant, pas dans Supabase Storage » — même
// logique retenue ici pour les documents), jamais servis par le site
// (claude/CRM_LAM_points_a_trancher.md, A30/A31 : « où vivent ces fichiers :
// proposition sur OVH, dans le dossier du bien, jamais servis par le site »).
// Ce module isole l'écriture disque pour que le branchement OVH, le jour
// venu, ne touche qu'un seul fichier.

import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "crypto";

// 28 septembre 2026 — en production sur Railway, les fichiers vont sur le
// volume persistant (DATA_DIR/documents), comme data.db : sans cela, ils
// étaient écrits dans le dossier de l'application et effacés à chaque
// redéploiement. En local, DATA_DIR n'est pas définie : data/documents/.
//
// En base, le chemin reste stocké sous la forme relative
// "data/documents/<sous-dossier>/<fichier>" (inchangé) ; cheminAbsoluDocument()
// le traduit vers l'emplacement réel.
export const RACINE_DOCUMENTS = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, "documents")
  : path.join(process.cwd(), "data", "documents");

const PREFIXE_RELATIF = path.join("data", "documents");

// Chemin relatif stocké en base → chemin absolu sur le disque, ou null s'il
// sort de la racine des documents (protection contre la traversée de chemin).
export function cheminAbsoluDocument(cheminRelatif: string): string | null {
  const normalise = path.normalize(cheminRelatif);
  if (!normalise.startsWith(PREFIXE_RELATIF + path.sep)) return null;
  const absolu = path.join(RACINE_DOCUMENTS, normalise.slice(PREFIXE_RELATIF.length + 1));
  if (!absolu.startsWith(RACINE_DOCUMENTS + path.sep)) return null;
  return absolu;
}

function assurerDossier(sousDossier: string): string {
  const dossier = path.join(RACINE_DOCUMENTS, sousDossier);
  fs.mkdirSync(dossier, { recursive: true });
  return dossier;
}

// Enregistre un PDF généré. Retourne le chemin relatif (stocké en base),
// jamais le chemin absolu du disque.
export function enregistrerPdf(sousDossier: string, nomFichier: string, contenu: Buffer): string {
  const dossier = assurerDossier(sousDossier);
  const chemin = path.join(dossier, nomFichier);
  fs.writeFileSync(chemin, contenu);
  return path.join("data", "documents", sousDossier, nomFichier);
}

// Enregistre la photo d'un document signé, envoyée depuis un <input type="file">
// d'un formulaire de server action. Retourne le chemin relatif, ou null si
// aucun fichier n'a été fourni.
export async function enregistrerPhotoPapier(sousDossier: string, fichier: File | null): Promise<string | null> {
  if (!fichier || fichier.size === 0) return null;
  const dossier = assurerDossier(sousDossier);
  const extension = (fichier.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const nomFichier = `${randomUUID()}.${extension}`;
  const chemin = path.join(dossier, nomFichier);
  const buffer = Buffer.from(await fichier.arrayBuffer());
  fs.writeFileSync(chemin, buffer);
  return path.join("data", "documents", sousDossier, nomFichier);
}
