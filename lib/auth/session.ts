// Session de connexion — décision de Seb du 28 septembre 2026 : connexion
// valable 7 jours par appareil, puis mot de passe + code redemandés.
//
// Le jeton est un cookie signé (HMAC-SHA256) avec la clé LAM_SESSION_SECRET,
// rangée dans les variables d'environnement Railway. Ce module n'utilise que
// Web Crypto (crypto.subtle) : il tourne à la fois dans le middleware (moteur
// « edge », sans accès au disque ni à SQLite) et côté serveur.
//
// Pour déconnecter tous les appareils d'un coup : changer LAM_SESSION_SECRET
// dans Railway.

export const NOM_COOKIE_SESSION = "lam_session";
export const DUREE_SESSION_SECONDES = 7 * 24 * 60 * 60;

const encodeur = new TextEncoder();

function base64url(octets: Uint8Array): string {
  let binaire = "";
  for (const o of octets) binaire += String.fromCharCode(o);
  return btoa(binaire).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function depuisBase64url(texte: string): Uint8Array {
  const b64 = texte.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((texte.length + 3) % 4);
  const binaire = atob(b64);
  const octets = new Uint8Array(binaire.length);
  for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
  return octets;
}

export function secretSession(): string | null {
  const secret = process.env.LAM_SESSION_SECRET?.trim();
  // Une clé trop courte se devine : on refuse de fonctionner avec.
  return secret && secret.length >= 32 ? secret : null;
}

async function cle(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encodeur.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function creerJetonSession(secret: string): Promise<string> {
  const charge = base64url(
    encodeur.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + DUREE_SESSION_SECONDES })),
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", await cle(secret), encodeur.encode(charge)));
  return `${charge}.${base64url(signature)}`;
}

export async function jetonSessionValide(jeton: string | undefined, secret: string): Promise<boolean> {
  if (!jeton) return false;
  const [charge, signature] = jeton.split(".");
  if (!charge || !signature) return false;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC",
      await cle(secret),
      depuisBase64url(signature),
      encodeur.encode(charge),
    );
    if (!ok) return false;
    const { exp } = JSON.parse(new TextDecoder().decode(depuisBase64url(charge))) as { exp?: number };
    return typeof exp === "number" && exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}
