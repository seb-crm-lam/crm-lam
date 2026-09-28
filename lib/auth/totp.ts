// Code de vérification — décision de Seb du 28 septembre 2026 : application
// de codes sur iPhone (app Mots de passe ou Google Authenticator), code à
// 6 chiffres renouvelé toutes les 30 secondes (norme TOTP, RFC 6238).

import { createHmac, randomBytes, timingSafeEqual } from "crypto";

const ALPHABET_BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function genererSecretTotp(): string {
  const octets = randomBytes(20);
  let bits = "";
  for (const o of octets) bits += o.toString(2).padStart(8, "0");
  let resultat = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) resultat += ALPHABET_BASE32[parseInt(bits.slice(i, i + 5), 2)];
  return resultat;
}

function decoderBase32(secret: string): Buffer {
  const propre = secret.replace(/=+$/, "").replace(/\s+/g, "").toUpperCase();
  let bits = "";
  for (const c of propre) {
    const valeur = ALPHABET_BASE32.indexOf(c);
    if (valeur < 0) throw new Error("secret TOTP invalide");
    bits += valeur.toString(2).padStart(5, "0");
  }
  const octets: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) octets.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(octets);
}

function codePourCompteur(cle: Buffer, compteur: number): string {
  const tampon = Buffer.alloc(8);
  tampon.writeBigUInt64BE(BigInt(compteur));
  const hmac = createHmac("sha1", cle).update(tampon).digest();
  const decalage = hmac[hmac.length - 1] & 0x0f;
  const nombre = (hmac.readUInt32BE(decalage) & 0x7fffffff) % 1_000_000;
  return String(nombre).padStart(6, "0");
}

// Accepte le code de la période en cours et celui de la période voisine
// (± 30 s), pour tolérer un léger décalage d'horloge du téléphone.
export function verifierCodeTotp(secret: string, code: string): boolean {
  const saisi = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(saisi)) return false;
  const cle = decoderBase32(secret);
  const compteur = Math.floor(Date.now() / 1000 / 30);
  for (const ecart of [-1, 0, 1]) {
    const attendu = codePourCompteur(cle, compteur + ecart);
    if (timingSafeEqual(Buffer.from(attendu), Buffer.from(saisi))) return true;
  }
  return false;
}

export function lienOtpauth(secret: string, email: string): string {
  const libelle = encodeURIComponent(`CRM LAM:${email}`);
  return `otpauth://totp/${libelle}?secret=${secret}&issuer=${encodeURIComponent("CRM LAM")}&algorithm=SHA1&digits=6&period=30`;
}
