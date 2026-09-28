"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { timingSafeEqual } from "crypto";
import { NOM_COOKIE_SESSION, DUREE_SESSION_SECONDES, creerJetonSession, secretSession } from "./session";
import { verifierCodeTotp } from "./totp";
import {
  compteExiste,
  connexionBloquee,
  creerUtilisateur,
  effacerEchecs,
  getUtilisateurParEmail,
  noterEchec,
  verifierMotDePasse,
} from "./utilisateur";

export interface EtatFormulaire {
  erreur?: string;
}

// N'accepte qu'un chemin interne ("/biens/…"), jamais une adresse externe.
function destinationSure(suite: FormDataEntryValue | null): string {
  const texte = typeof suite === "string" ? suite : "";
  return texte.startsWith("/") && !texte.startsWith("//") ? texte : "/journee";
}

async function ouvrirSession() {
  const secret = secretSession();
  if (!secret) throw new Error("LAM_SESSION_SECRET absente ou trop courte");
  cookies().set(NOM_COOKIE_SESSION, await creerJetonSession(secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DUREE_SESSION_SECONDES,
  });
}

export async function seConnecter(_etat: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  if (!secretSession()) {
    return { erreur: "Configuration incomplète : la variable LAM_SESSION_SECRET manque dans Railway." };
  }
  if (connexionBloquee()) {
    return { erreur: "Trop d'essais. Connexion bloquée 15 minutes." };
  }

  const email = String(formData.get("email") ?? "");
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const code = String(formData.get("code") ?? "");

  const utilisateur = getUtilisateurParEmail(email);
  const ok =
    !!utilisateur && verifierMotDePasse(motDePasse, utilisateur.motDePasseHash) && verifierCodeTotp(utilisateur.totpSecret, code);

  if (!ok) {
    noterEchec();
    // Message volontairement unique : on ne dit pas lequel des trois est faux.
    return { erreur: "E-mail, mot de passe ou code incorrect." };
  }

  effacerEchecs();
  await ouvrirSession();
  redirect(destinationSure(formData.get("suite")));
}

export async function installer(_etat: EtatFormulaire, formData: FormData): Promise<EtatFormulaire> {
  if (compteExiste()) return { erreur: "Le compte existe déjà. L'installation est fermée." };

  const codeAttendu = process.env.LAM_SETUP_CODE?.trim() ?? "";
  const codeSaisi = String(formData.get("codeInstallation") ?? "").trim();
  if (
    !codeAttendu ||
    codeSaisi.length !== codeAttendu.length ||
    !timingSafeEqual(Buffer.from(codeSaisi), Buffer.from(codeAttendu))
  ) {
    noterEchec();
    return { erreur: "Code d'installation incorrect." };
  }
  if (!secretSession()) {
    return { erreur: "Configuration incomplète : la variable LAM_SESSION_SECRET manque dans Railway." };
  }

  const email = String(formData.get("email") ?? "").trim();
  const motDePasse = String(formData.get("motDePasse") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "");
  const totpSecret = String(formData.get("totpSecret") ?? "");
  const code = String(formData.get("code") ?? "");

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { erreur: "Adresse e-mail invalide." };
  if (motDePasse.length < 12) return { erreur: "Le mot de passe doit faire au moins 12 caractères." };
  if (motDePasse !== confirmation) return { erreur: "Les deux mots de passe ne sont pas identiques." };
  if (!/^[A-Z2-7]{32}$/.test(totpSecret)) return { erreur: "Page expirée : rechargez-la et recommencez." };
  if (!verifierCodeTotp(totpSecret, code)) {
    return { erreur: "Code de l'application incorrect. Vérifiez que vous avez bien scanné le QR code de cette page." };
  }

  creerUtilisateur(email, motDePasse, totpSecret);
  effacerEchecs();
  await ouvrirSession();
  redirect("/journee");
}

export async function seDeconnecter() {
  cookies().delete(NOM_COOKIE_SESSION);
  redirect("/connexion");
}
