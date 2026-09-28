// Compte unique du CRM (Seb seul — cadrage §2). Le compte est créé une seule
// fois par la page /installation, protégée par le code LAM_SETUP_CODE rangé
// dans les variables d'environnement Railway ; une fois le compte créé, la
// page d'installation est fermée définitivement.

import { randomUUID, scryptSync, randomBytes, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";

export interface Utilisateur {
  id: string;
  email: string;
  motDePasseHash: string;
  totpSecret: string;
}

export function hacherMotDePasse(motDePasse: string): string {
  const sel = randomBytes(16);
  const hache = scryptSync(motDePasse, sel, 64);
  return `scrypt$${sel.toString("hex")}$${hache.toString("hex")}`;
}

export function verifierMotDePasse(motDePasse: string, stocke: string): boolean {
  const [algo, selHex, hacheHex] = stocke.split("$");
  if (algo !== "scrypt" || !selHex || !hacheHex) return false;
  const attendu = Buffer.from(hacheHex, "hex");
  const calcule = scryptSync(motDePasse, Buffer.from(selHex, "hex"), attendu.length);
  return timingSafeEqual(attendu, calcule);
}

export function compteExiste(): boolean {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM Utilisateur`).get() as { n: number };
  return row.n > 0;
}

export function getUtilisateurParEmail(email: string): Utilisateur | undefined {
  return db
    .prepare(`SELECT id, email, motDePasseHash, totpSecret FROM Utilisateur WHERE email = ?`)
    .get(email.trim().toLowerCase()) as Utilisateur | undefined;
}

export function creerUtilisateur(email: string, motDePasse: string, totpSecret: string): void {
  db.prepare(
    `INSERT INTO Utilisateur (id, email, motDePasseHash, totpSecret, dateCreation)
     VALUES (?, ?, ?, ?, datetime('now'))`,
  ).run(randomUUID(), email.trim().toLowerCase(), hacherMotDePasse(motDePasse), totpSecret);
}

// Anti-essais répétés : 5 échecs en 15 minutes bloquent la connexion
// 15 minutes. Tenu en mémoire (un seul serveur, un seul utilisateur) :
// un redémarrage remet le compteur à zéro, ce qui reste acceptable.
const FENETRE_MS = 15 * 60 * 1000;
const MAX_ECHECS = 5;
let echecs: number[] = [];

export function connexionBloquee(): boolean {
  const maintenant = Date.now();
  echecs = echecs.filter((t) => maintenant - t < FENETRE_MS);
  return echecs.length >= MAX_ECHECS;
}

export function noterEchec(): void {
  echecs.push(Date.now());
}

export function effacerEchecs(): void {
  echecs = [];
}
