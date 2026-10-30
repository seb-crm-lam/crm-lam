// Conversion des photos à l'ajout dans le CRM (décision de Seb, 30 octobre 2026).
//
// Entrée : un fichier envoyé depuis la fiche d'un bien (HEIC d'iPhone, JPEG,
// PNG ou WebP). Sortie : un JPEG de 3000 px maximum sur le grand côté,
// qualité 85, orienté correctement, sans EXIF ni GPS. On ne garde que ce JPEG :
// l'original HEIC reste sur l'iPhone / le Mac de Seb.
//
// Module pur : aucun accès à la base ni au disque.
//
// Mémoire : le décodage HEIC pleine résolution (heic-convert) pèse environ
// 526 Mo en pointe — les photos doivent donc être traitées une par une par
// l'appelant, jamais en parallèle.

import sharp from "sharp";
import convert from "heic-convert";

export const COTE_MAX_PX = 3000;
export const QUALITE_JPEG = 85;

export type PhotoConvertie = {
  buffer: Buffer;
  nom: string; // nom d'origine avec l'extension .jpg
  largeur: number;
  hauteur: number;
};

export class ConversionPhotoError extends Error {
  constructor(public nomFichier: string, message: string) {
    super(message);
    this.name = "ConversionPhotoError";
  }
}

// HEIC/HEIF reconnu par l'extension ou par la signature « ftyp » (octets 4 à 11).
function estHeic(buffer: Buffer, nom: string): boolean {
  if (/\.(heic|heif)$/i.test(nom)) return true;
  if (buffer.length < 12) return false;
  if (buffer.toString("ascii", 4, 8) !== "ftyp") return false;
  const marque = buffer.toString("ascii", 8, 12).toLowerCase();
  return ["heic", "heix", "hevc", "hevx", "heim", "heis", "hevm", "hevs", "mif1", "msf1"].includes(marque);
}

function nomJpeg(nom: string): string {
  const base = nom.replace(/\.[^./\\]+$/, "").replace(/[^A-Za-z0-9._-]/g, "_") || "photo";
  return `${base}.jpg`;
}

export async function convertirPhoto(buffer: Buffer, nomFichier: string): Promise<PhotoConvertie> {
  try {
    let source: Buffer = buffer;

    if (estHeic(buffer, nomFichier)) {
      // sharp (libvips du serveur) ne lit pas ce HEIC : on décode d'abord en JPEG
      // pleine qualité, puis sharp redimensionne.
      const decode = await convert({ buffer, format: "JPEG", quality: 1 });
      source = Buffer.from(decode);
    }

    // rotate() sans argument applique l'orientation EXIF puis la retire.
    // Par défaut sharp n'écrit ni EXIF ni GPS dans la sortie.
    const { data, info } = await sharp(source, { failOn: "error" })
      .rotate()
      .resize({ width: COTE_MAX_PX, height: COTE_MAX_PX, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: QUALITE_JPEG, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    return { buffer: data, nom: nomJpeg(nomFichier), largeur: info.width, hauteur: info.height };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new ConversionPhotoError(nomFichier, `Photo « ${nomFichier} » : conversion impossible (${detail}).`);
  }
}
