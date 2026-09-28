// Publication d'un bien vers ladressemarrakchie.com — décision de Seb du
// 28 septembre 2026 (claude/CRM_LAM_decisions_28_septembre_publication_site.md).
//
// Contrat fixé par le site (notes des 25, 26 et 27 septembre) :
//   A. POST /biens                     fiche JSON (contrat fermé)
//   B. POST /biens/<réf>/photos        fichiers, 20 au plus par envoi
//   C. POST /biens/<réf>/finaliser     rappelé tant que « en cours de traitement »
//
// Règles tenues ici :
// - LISTE BLANCHE : la fiche est construite champ par champ ; aucun champ
//   interne (adresse exacte, coordonnées exactes, prix plancher, honoraires,
//   prix fonds/murs, notes, propriétaire…) ne peut partir. Recevoir l'un d'eux
//   ferait refuser tout l'envoi par le site (décision 3).
// - Listes envoyées par leur NOM affiché, au caractère près (cadrage §11).
// - Clés propres à un type envoyées seulement pour ce type (le site refuse
//   un champ réservé à un autre type).
// - Photos envoyées seulement si elles ont changé depuis la dernière
//   publication réussie (décision 2).
// - Brouillon / off-market jamais publié : rien n'est envoyé.

import { createHash, randomUUID } from "crypto";
import fs from "node:fs";
import path from "node:path";
import { db } from "@/lib/db";
import { getBien, getBienPhotos, getBienPrestations } from "@/lib/repo";
import { cheminAbsoluDocument } from "@/lib/documents/storage";
import type { Bien, BienPhoto } from "@/lib/types";

const URL_PAR_DEFAUT = "https://ladressemarrakchie.com/wp-json/lam/v1";
const PHOTOS_PAR_ENVOI = 20;
const EXTENSIONS_ACCEPTEES = new Set([".heic", ".heif", ".jpg", ".jpeg", ".png", ".webp"]);
const PAUSE_FINALISER_MS = 3000;
const DUREE_MAX_FINALISER_MS = 10 * 60 * 1000;

// --- Noms affichés, au caractère près (contrat du 26 septembre, §4) --------

const TYPE: Record<string, string> = {
  riad: "Riad",
  villa: "Villa",
  appartement: "Appartement",
  terrain: "Terrain",
  fonds_commerce: "Fonds de commerce",
};
const TRANSACTION: Record<string, string> = { vente: "Vente", location_longue_duree: "Location longue durée" };
const ETAT: Record<string, string> = { a_renover: "À rénover", en_exploitation: "En exploitation" };
const STATUT_JURIDIQUE: Record<string, string> = {
  titre_foncier: "Titre foncier",
  melkia: "Melkia",
  en_requisition: "En réquisition",
};
const MENTION: Record<string, string> = { coup_de_coeur: "Coup de cœur", rare: "Rare" };
const NATURE_VENTE: Record<string, string> = { murs: "Murs", fonds: "Fonds", murs_et_fonds: "Murs et fonds" };
const ETAT_EXPLOITATION: Record<string, string> = { en_activite: "En activité", en_cessation: "En cessation" };
// Le CRM affiche « Climatisation / chauffage » ; le site attend « Climatisation ».
const EQUIPEMENT: Record<string, string> = {
  equipe: "Équipé",
  chambre_froide: "Chambre froide",
  gaz: "Gaz",
  climatisation: "Climatisation",
};
const DIFFUSIONS = ["brouillon", "off_market", "publie", "publie_hors_catalogue", "archive"];
const STATUTS = ["disponible", "sous_promesse", "vendu", "loue", "retire"];

function nomListe(table: Record<string, string>, valeur: string | null, champ: string): string | null {
  if (valeur === null || valeur === undefined || valeur === "") return null;
  const nom = table[valeur];
  if (!nom) throw new ErreurPublication(`Valeur inconnue pour « ${champ} » : ${valeur}`);
  return nom;
}

export class ErreurPublication extends Error {}

// --- Photos ---------------------------------------------------------------

function nomFichierPhoto(p: BienPhoto): string {
  return path.basename(p.cheminOriginal);
}

function photosPubliables(bienId: string): BienPhoto[] {
  return getBienPhotos(bienId).filter((p) =>
    EXTENSIONS_ACCEPTEES.has(path.extname(p.cheminOriginal).toLowerCase()),
  );
}

// Empreinte de la liste des photos (identité + ordre) : si elle n'a pas
// bougé depuis la dernière publication réussie, les photos ne repartent pas.
function signaturePhotos(photos: BienPhoto[]): string {
  return createHash("sha256")
    .update(photos.map((p) => p.id).join("|"))
    .digest("hex");
}

// --- Fiche (appel A) --------------------------------------------------------

interface Quartiers {
  quartier: string | null;
  quartierParent: string | null;
}

function nomsQuartier(quartierId: string | null): Quartiers {
  if (!quartierId) return { quartier: null, quartierParent: null };
  const q = db.prepare(`SELECT nom, quartierParentId FROM Quartier WHERE id = ?`).get(quartierId) as
    | { nom: string; quartierParentId: string | null }
    | undefined;
  if (!q) return { quartier: null, quartierParent: null };
  const parent = q.quartierParentId
    ? (db.prepare(`SELECT nom FROM Quartier WHERE id = ?`).get(q.quartierParentId) as { nom: string } | undefined)
    : undefined;
  return { quartier: q.nom, quartierParent: parent?.nom ?? null };
}

const texte = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

export function construireFiche(bien: Bien, photos: BienPhoto[] | null): Record<string, unknown> {
  const t = bien.typeBien;
  const estFonds = t === "fonds_commerce";
  const estLocation = bien.transaction === "location_longue_duree";
  const { quartier, quartierParent } = nomsQuartier(bien.quartierId);

  const fiche: Record<string, unknown> = {
    reference: bien.reference,
    diffusion: bien.diffusionEtat,
    statutCommercial: bien.statutCommercial,
    titre: bien.titre,
    description: texte(bien.description),
    situation: texte(bien.situation),
    typeBien: nomListe(TYPE, t, "type de bien"),
    transaction_: nomListe(TRANSACTION, bien.transaction, "transaction"),
    etatBien: nomListe(ETAT, bien.etatBien, "état du bien"),
    statutJuridique: nomListe(STATUT_JURIDIQUE, bien.statutJuridique, "statut juridique"),
    mentionEditoriale: bien.mentionEditoriale ? nomListe(MENTION, bien.mentionEditoriale, "mention") : "Aucune",
    quartier,
    quartierParent,
    prestations: getBienPrestations(bien.id).map((p) => p.nom),
    // Prix : vide quand « sur demande » (règles 1 et 2 de la note du 26 septembre).
    prixSurDemande: bien.prixSurDemande,
    prixVente: bien.prixSurDemande ? null : bien.prixVente,
    afficherPrixM2: bien.afficherPrixM2,
    exclusivite: bien.exclusivite,
    chambres: bien.chambres,
    sallesBain: bien.sallesBain,
    niveaux: bien.niveaux,
    etage: bien.etage,
    ville: texte(bien.ville),
    // Coordonnées PUBLIÉES (décalées, tirées une fois) — jamais les exactes.
    latitude: bien.latitudePubliee,
    longitude: bien.longitudePubliee,
    conseillerReferent: texte(bien.conseillerReferent),
  };

  if (estLocation) {
    fiche.loyerMensuel = bien.loyerMensuel;
    fiche.chargesMensuelles = bien.chargesMensuelles;
  }
  if (t === "riad" || t === "villa" || estFonds) fiche.surfaceSol = bien.surfaceSol;
  if (t === "villa" || t === "appartement") fiche.surfaceHabitable = bien.surfaceHabitable;
  if (t === "villa" || t === "terrain") fiche.surfaceTerrain = bien.surfaceTerrain;
  if (t === "terrain") {
    fiche.terrainViabilise = bien.terrainViabilise ?? false;
    fiche.constructible = bien.constructible ?? false;
  }
  // Licence : riad « En exploitation » seulement (18 et 26 septembre).
  if (t === "riad" && bien.etatBien === "en_exploitation") {
    fiche.licenceExploitationTouristique = bien.licenceExploitationTouristique;
  }
  if (estFonds) {
    fiche.natureVente = nomListe(NATURE_VENTE, bien.natureVente, "nature de la vente");
    fiche.etatExploitation = nomListe(ETAT_EXPLOITATION, bien.etatExploitation, "état d'exploitation");
    fiche.activite = texte(bien.activite);
    fiche.capaciteValeur = bien.capaciteValeur;
    fiche.capaciteUnite = texte(bien.capaciteUnite);
    fiche.salaries = bien.salaries;
    fiche.joursOuverture = texte(bien.joursOuverture);
    fiche.horairesOuverture = texte(bien.horairesOuverture);
    fiche.licenceAlcool = bien.licenceAlcool ?? false;
    fiche.droitTerrasse = bien.droitTerrasse ?? false;
    fiche.autorisationExploitation = bien.autorisationExploitation ?? false;
    fiche.autorisationExploitationActivite = texte(bien.autorisationExploitationActivite);
    fiche.equipement = (bien.equipement ?? []).map((e) => nomListe(EQUIPEMENT, e, "équipement"));
  }
  if (photos) fiche.photos = photos.map(nomFichierPhoto);
  return fiche;
}

// --- Appels au site ------------------------------------------------------------

interface ReponseSite {
  http: number;
  reference?: string;
  adresse?: string | null;
  identifiant?: number | null;
  resultat?: string;
  message?: string;
  erreurs?: string[];
  photosEnEchec?: { nom: string; raison?: string }[];
}

function identifiants() {
  const utilisateur = process.env.LAM_SITE_UTILISATEUR?.trim();
  const motDePasse = process.env.LAM_SITE_MOT_DE_PASSE?.trim();
  if (!utilisateur || !motDePasse) {
    throw new ErreurPublication(
      "Identifiants du site absents : variables LAM_SITE_UTILISATEUR et LAM_SITE_MOT_DE_PASSE à ranger dans Railway.",
    );
  }
  const base = (process.env.LAM_SITE_URL?.trim() || URL_PAR_DEFAUT).replace(/\/+$/, "");
  return { base, auth: "Basic " + Buffer.from(`${utilisateur}:${motDePasse}`).toString("base64") };
}

async function appeler(chemin: string, init: RequestInit): Promise<ReponseSite> {
  const { base, auth } = identifiants();
  let res: Response;
  try {
    res = await fetch(base + chemin, {
      ...init,
      headers: { Authorization: auth, Accept: "application/json", ...(init.headers ?? {}) },
      signal: AbortSignal.timeout(120_000),
    });
  } catch (e) {
    throw new ErreurPublication(`Site injoignable : ${e instanceof Error ? e.message : String(e)}`);
  }
  let corps: any = {};
  try {
    corps = await res.json();
  } catch {
    corps = {};
  }
  if (res.status === 401 || res.status === 403) {
    throw new ErreurPublication("Le site refuse les identifiants du CRM (compte crm-lam ou mot de passe d'application).");
  }
  if (res.status === 404) {
    throw new ErreurPublication("Le site ne connaît pas ce bien (envoi des photos avant la fiche).");
  }
  if (res.status >= 500) {
    throw new ErreurPublication(`Erreur du site (HTTP ${res.status}). Réessayer plus tard.`);
  }
  return { http: res.status, ...corps };
}

const enCours = (r: ReponseSite) => (r.resultat ?? "").startsWith("en cours");
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function envoyerPhotos(reference: string, photos: BienPhoto[]) {
  for (let i = 0; i < photos.length; i += PHOTOS_PAR_ENVOI) {
    const lot = photos.slice(i, i + PHOTOS_PAR_ENVOI);
    const form = new FormData();
    for (const p of lot) {
      const absolu = cheminAbsoluDocument(p.cheminOriginal);
      if (!absolu || !fs.existsSync(absolu)) {
        throw new ErreurPublication(`Photo introuvable sur le disque du CRM : ${nomFichierPhoto(p)}`);
      }
      form.append("photos[]", new Blob([fs.readFileSync(absolu)]), nomFichierPhoto(p));
    }
    const r = await appeler(`/biens/${encodeURIComponent(reference)}/photos`, { method: "POST", body: form });
    if (r.http === 422) return r;
  }
  return null;
}

async function finaliser(reference: string): Promise<ReponseSite> {
  const debut = Date.now();
  for (;;) {
    const r = await appeler(`/biens/${encodeURIComponent(reference)}/finaliser`, { method: "POST" });
    if (!enCours(r)) return r;
    if (Date.now() - debut > DUREE_MAX_FINALISER_MS) {
      throw new ErreurPublication(
        "Le site traite encore les photos après 10 minutes. Relancer la publication plus tard : rien n'est perdu.",
      );
    }
    await pause(PAUSE_FINALISER_MS);
  }
}

// --- Orchestration ------------------------------------------------------------------

export interface ResultatPublication {
  ok: boolean;
  titre: string;
  details: string[];
  adresse?: string | null;
}

function enregistrer(bienId: string, resume: string, detail: string, r?: ReponseSite, signature?: string | null) {
  db.prepare(
    `UPDATE Bien SET
       siteDernierePublication = datetime('now'),
       siteDernierResultat = @resume,
       siteIdentifiant = COALESCE(@identifiant, siteIdentifiant),
       siteAdresse = CASE WHEN @majAdresse = 1 THEN @adresse ELSE siteAdresse END,
       sitePhotosSignature = COALESCE(@signature, sitePhotosSignature)
     WHERE id = @bienId`,
  ).run({
    bienId,
    resume,
    identifiant: r?.identifiant ?? null,
    // L'adresse n'est remplie que lorsque le bien est en ligne : on la
    // met à jour à chaque réponse finale du site (vide = hors ligne).
    majAdresse: r && !enCours(r) && r.http === 200 ? 1 : 0,
    adresse: r?.adresse ?? null,
    signature: signature ?? null,
  });
  db.prepare(
    `INSERT INTO Evenement (id, bienId, typeEvenement, detail) VALUES (?, ?, 'publication_site', ?)`,
  ).run(randomUUID(), bienId, detail);
}

export async function publierBienSurSite(bienId: string): Promise<ResultatPublication> {
  const bien = getBien(bienId);
  if (!bien) return { ok: false, titre: "Bien introuvable.", details: [] };

  try {
    if (!DIFFUSIONS.includes(bien.diffusionEtat) || !STATUTS.includes(bien.statutCommercial)) {
      throw new ErreurPublication("Diffusion ou statut commercial inconnu.");
    }
    const dejaEnvoye = bien.siteIdentifiant !== null && bien.siteIdentifiant !== undefined;
    const retrait =
      ["brouillon", "off_market", "archive"].includes(bien.diffusionEtat) || bien.statutCommercial === "retire";

    // Off-market ou brouillon jamais publié : rien ne part (cadrage §8).
    if (retrait && !dejaEnvoye) {
      return {
        ok: true,
        titre: "Rien à envoyer : ce bien n'a jamais été sur le site.",
        details: ["Pour le publier, passer sa diffusion à « Publié » ou « Publié hors catalogue »."],
      };
    }

    let r: ReponseSite;
    let signature: string | null = null;

    if (retrait) {
      // Retrait : trois clés suffisent (contrat du 26 septembre, §4).
      r = await appeler("/biens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: bien.reference,
          diffusion: bien.diffusionEtat,
          statutCommercial: bien.statutCommercial,
        }),
      });
    } else {
      const photos = photosPubliables(bien.id);
      if (photos.length === 0) {
        throw new ErreurPublication("Impossible de publier sans photo (seul refus technique, 14 septembre).");
      }
      signature = signaturePhotos(photos);
      const photosChangees = !dejaEnvoye || signature !== bien.sitePhotosSignature;
      const fiche = construireFiche(bien, photosChangees ? photos : null);

      r = await appeler("/biens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fiche),
      });
      if (r.http !== 422 && photosChangees) {
        const refus = await envoyerPhotos(bien.reference, photos);
        r = refus ?? (await finaliser(bien.reference));
      } else if (enCours(r)) {
        r = await finaliser(bien.reference);
      }
    }

    const resultat = r.resultat ?? `HTTP ${r.http}`;
    if (r.http === 422 || resultat === "refusé") {
      const details = [r.message, ...(r.erreurs ?? [])].filter(Boolean) as string[];
      enregistrer(bien.id, "refusé", `Refusé par le site : ${details.join(" · ")}`, r);
      return { ok: false, titre: "Le site a refusé l'envoi.", details };
    }

    const echecs = r.photosEnEchec ?? [];
    const details = echecs.map((e) => `Photo à renvoyer : ${e.nom}${e.raison ? ` (${e.raison})` : ""}`);
    // La signature n'est retenue que si toutes les photos sont passées :
    // sinon, la prochaine publication les renverra.
    enregistrer(
      bien.id,
      resultat,
      `Site : ${resultat}${r.adresse ? ` — ${r.adresse}` : ""}${details.length ? ` — ${details.join(" · ")}` : ""}`,
      r,
      echecs.length === 0 ? signature : null,
    );
    return { ok: true, titre: `Site : ${resultat}.`, details, adresse: r.adresse ?? null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    enregistrer(bien.id, "échec", `Échec de la publication : ${message}`);
    return { ok: false, titre: "La publication n'a pas abouti.", details: [message] };
  }
}
