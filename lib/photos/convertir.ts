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
// eslint-disable-next-line @typescript-eslint/no-var-requires
const libheif = require("libheif-js/wasm-bundle");

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

async function decoderHeic(buffer: Buffer): Promise<{ pixels: Buffer; largeur: number; hauteur: number }> {
  const images = new libheif.HeifDecoder().decode(buffer);
  if (!images || images.length === 0) throw new Error("fichier HEIC illisible");
  const image = images[0];
  const largeur: number = image.get_width();
  const hauteur: number = image.get_height();
  const sortie = { data: new Uint8ClampedArray(largeur * hauteur * 4), width: largeur, height: hauteur };
  await new Promise<void>((ok, ko) => image.display(sortie, (r: unknown) => (r ? ok() : ko(new Error("décodage HEIC impossible")))));
  return { pixels: Buffer.from(sortie.data.buffer), largeur, hauteur };
}

export async function convertirPhoto(buffer: Buffer, nomFichier: string): Promise<PhotoConvertie> {
  try {
    let source: Buffer = buffer;

    let entree: ReturnType<typeof sharp>;
    if (estHeic(buffer, nomFichier)) {
      // sharp (libvips du serveur) ne lit pas ce HEIC : libheif-js décode les
      // pixels directement, sharp les reçoit bruts (pas d'encodage JPEG
      // intermédiaire). libheif applique lui-même la rotation du fichier.
      const { pixels, largeur, hauteur } = await decoderHeic(buffer);
      entree = sharp(pixels, { raw: { width: largeur, height: hauteur, channels: 4 } });
    } else {
      // rotate() applique l'orientation EXIF puis la retire.
      entree = sharp(buffer, { failOn: "error" }).rotate();
    }

    // Par défaut sharp n'écrit ni EXIF ni GPS dans la sortie.
    const { data, info } = await entree
      .resize({ width: COTE_MAX_PX, height: COTE_MAX_PX, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: QUALITE_JPEG, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });

    return { buffer: data, nom: nomJpeg(nomFichier), largeur: info.width, hauteur: info.height };
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new ConversionPhotoError(nomFichier, `Photo « ${nomFichier} » : conversion impossible (${detail}).`);
  }
}
