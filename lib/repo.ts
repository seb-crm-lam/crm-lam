import { db } from "./db";
import { PIECES_DOSSIER, blocFondsActif, blocSocieteActif, type BlocPieces } from "./pieces";
import type {
  Bien,
  BienPhoto,
  BonVisite,
  BonVisiteLigne,
  Contact,
  Demande,
  Document,
  Evenement,
  PieceDossier,
  Prestation,
  Quartier,
  Recherche,
  Visite,
} from "./types";

// ---------------------------------------------------------------------------
// Mapping ligne SQLite -> objet typé
// ---------------------------------------------------------------------------

function toBool(v: unknown): boolean {
  return v === 1 || v === true;
}
function toBoolN(v: unknown): boolean | null {
  return v === null || v === undefined ? null : toBool(v);
}

function mapBien(row: any): Bien {
  return {
    ...row,
    transaction: row.transaction_,
    prixSurDemande: toBool(row.prixSurDemande),
    afficherPrixM2: toBool(row.afficherPrixM2),
    licenceExploitationTouristique: toBool(row.licenceExploitationTouristique),
    exclusivite: toBool(row.exclusivite),
    solutionCleEnMainChiffree: toBool(row.solutionCleEnMainChiffree),
    terrainViabilise: toBoolN(row.terrainViabilise),
    constructible: toBoolN(row.constructible),
    licenceAlcool: toBoolN(row.licenceAlcool),
    droitTerrasse: toBoolN(row.droitTerrasse),
    autorisationExploitation: toBoolN(row.autorisationExploitation),
    apporteurProcurationAuthentique: toBoolN(row.apporteurProcurationAuthentique),
    clesConfiees: toBoolN(row.clesConfiees),
    partageConfrere: toBoolN(row.partageConfrere),
    piecesFonds: toBoolN(row.piecesFonds),
    equipement: row.equipement ? JSON.parse(row.equipement) : null,
  } as Bien;
}

function mapContact(row: any): Contact {
  return {
    ...row,
    consentementProspection: toBool(row.consentementProspection),
    accordReponse: toBool(row.accordReponse),
    anonymise: toBool(row.anonymise),
  } as Contact;
}

function mapRecherche(row: any): Recherche {
  return { ...row } as Recherche;
}

function mapDemande(row: any): Demande {
  return {
    ...row,
    lu: toBool(row.lu),
    alerteEnvoyee: toBool(row.alerteEnvoyee),
    exploite: toBoolN(row.exploite),
  } as Demande;
}

// ---------------------------------------------------------------------------
// Biens
// ---------------------------------------------------------------------------

const BIEN_SELECT = `
  SELECT b.*, b.transaction_ AS transaction_, q.nom AS quartierNom
  FROM Bien b LEFT JOIN Quartier q ON q.id = b.quartierId
`;

export function listBiens(): Bien[] {
  return db.prepare(`${BIEN_SELECT} ORDER BY b.createdAt DESC`).all().map(mapBien);
}

export function listQuartiers(): Quartier[] {
  return db
    .prepare(`SELECT * FROM Quartier ORDER BY nom ASC`)
    .all()
    .map((r: any) => ({ ...r, texteIntroductionPublie: toBool(r.texteIntroductionPublie) }));
}

export function listPrestations(): Prestation[] {
  return db.prepare(`SELECT * FROM Prestation ORDER BY rowid ASC`).all() as Prestation[];
}

export function getBien(id: string): Bien | undefined {
  const row = db.prepare(`${BIEN_SELECT} WHERE b.id = ?`).get(id);
  return row ? mapBien(row) : undefined;
}

export function getBienPhotos(bienId: string): BienPhoto[] {
  return db
    .prepare(`SELECT * FROM BienPhoto WHERE bienId = ? ORDER BY ordre ASC`)
    .all(bienId)
    .map((r: any) => ({ ...r, exifNettoye: toBool(r.exifNettoye) }));
}

export function getBienPrestations(bienId: string): Prestation[] {
  return db
    .prepare(
      `SELECT p.* FROM Prestation p
       JOIN BienPrestation bp ON bp.prestationId = p.id
       WHERE bp.bienId = ?
       ORDER BY p.rowid ASC`
    )
    .all(bienId) as Prestation[];
}

function mapDocument(row: any): Document {
  return { ...row, signe: toBool(row.signe) } as Document;
}

export function getBienDocuments(bienId: string): Document[] {
  return db
    .prepare(`SELECT * FROM Document WHERE bienId = ? ORDER BY dateGeneration DESC`)
    .all(bienId)
    .map(mapDocument);
}

export function getDocument(id: string): Document | undefined {
  const row = db.prepare(`SELECT * FROM Document WHERE id = ?`).get(id);
  return row ? mapDocument(row) : undefined;
}

// Feu vert de publication (cadrage §0 / A21) : titre, type, quartier,
// surface, prix (ou sur demande), statut juridique titré/melkia, ≥1 photo,
// mandat signé, autorisation de diffusion, certificat < 3 mois.
export interface FeuVert {
  total: number;
  obtenus: number;
  manquants: string[];
}

export function calculerFeuVert(bien: Bien): FeuVert {
  const photos = getBienPhotos(bien.id);
  const documents = getBienDocuments(bien.id);
  const mandatSigne = documents.some((d) => d.typeDocument === "mandat" && toBool(d.signe));

  const criteres: { label: string; ok: boolean }[] = [
    { label: "Titre", ok: !!bien.titre },
    { label: "Type de bien", ok: !!bien.typeBien },
    { label: "Quartier", ok: !!bien.quartierId },
    {
      label: "Surface",
      ok: !!(bien.surfaceSol || bien.surfaceHabitable || bien.surfaceTerrain),
    },
    { label: "Prix (ou sur demande)", ok: bien.prixSurDemande || !!bien.prixVente },
    {
      label: "Statut juridique (titré ou melkia)",
      ok: bien.statutJuridique === "titre_foncier" || bien.statutJuridique === "melkia",
    },
    { label: "Au moins une photo", ok: photos.length > 0 },
    { label: "Mandat signé par tous", ok: mandatSigne },
    { label: "Autorisation de diffusion", ok: mandatSigne },
    { label: "Certificat de propriété < 3 mois", ok: false }, // jamais simulé dans ce prototype
  ];

  return {
    total: criteres.length,
    obtenus: criteres.filter((c) => c.ok).length,
    manquants: criteres.filter((c) => !c.ok).map((c) => c.label),
  };
}

// ---------------------------------------------------------------------------
// Dossier de pièces vendeur (A25) — une ligne par pièce du catalogue fixe
// (lib/pieces.ts), fusionnée avec l'état enregistré en base s'il existe.
// Une pièce jamais touchée n'a donc pas de ligne en base : elle apparaît
// simplement comme « non reçue ».
// ---------------------------------------------------------------------------

export function getPiecesDossier(bien: Bien): (PieceDossier & { nom: string; niveau: 1 | 2 | 3; bloc: BlocPieces })[] {
  const bienId = bien.id;
  const rows = db
    .prepare(`SELECT * FROM PieceDossier WHERE bienId = ?`)
    .all(bienId) as any[];
  const parCle = new Map(rows.map((r) => [r.pieceKey, r]));
  const societe = blocSocieteActif(bien);
  const fonds = blocFondsActif(bien);

  return PIECES_DOSSIER.filter(
    (p) => !p.bloc || p.bloc === "base" || (p.bloc === "societe" && societe) || (p.bloc === "fonds" && fonds)
  ).map((piece) => {
    const row = parCle.get(piece.key);
    return {
      id: row?.id ?? "",
      bienId,
      pieceKey: piece.key,
      nom: piece.nom,
      niveau: piece.niveau,
      bloc: piece.bloc ?? "base",
      recueLe: row?.recueLe ?? null,
      conforme: row ? toBoolN(row.conforme) : null,
      relanceDemandee: row ? toBool(row.relanceDemandee) : false,
      updatedAt: row?.updatedAt ?? "",
    };
  });
}

// ---------------------------------------------------------------------------
// Contacts et recherches
// ---------------------------------------------------------------------------

export function listContacts(): Contact[] {
  return db.prepare(`SELECT * FROM Contact ORDER BY dateDernierContact DESC`).all().map(mapContact);
}

// Pour l'écran liste : ajoute le signal « a une recherche active » sans
// obliger chaque appelant à recharger les recherches séparément.
export function listContactsAvecRechercheActive(): (Contact & { rechercheActive: boolean })[] {
  const idsAvecRecherche = new Set(
    (db.prepare(`SELECT DISTINCT contactId FROM Recherche WHERE statut = 'actif'`).all() as { contactId: string }[]).map(
      (r) => r.contactId
    )
  );
  return listContacts().map((c) => ({ ...c, rechercheActive: idsAvecRecherche.has(c.id) }));
}

export function getContact(id: string): Contact | undefined {
  const row = db.prepare(`SELECT * FROM Contact WHERE id = ?`).get(id);
  return row ? mapContact(row) : undefined;
}

export function getRecherchesForContact(contactId: string): Recherche[] {
  return db
    .prepare(
      `SELECT r.*, q.nom as quartierNom FROM Recherche r
       LEFT JOIN Quartier q ON q.id = r.quartierId
       WHERE r.contactId = ? ORDER BY r.createdAt DESC`
    )
    .all(contactId)
    .map(mapRecherche);
}

export function getEvenementsForContact(contactId: string): Evenement[] {
  return db
    .prepare(`SELECT * FROM Evenement WHERE contactId = ? ORDER BY dateEvenement DESC`)
    .all(contactId) as Evenement[];
}

// Envois WhatsApp du jour — correction possible depuis « Ma journée » (A8).
// Fenêtre retenue : la journée en cours (heure du Mac).
export type EnvoiDuJour = Evenement & {
  contactNom: string | null;
  contactPrenom: string | null;
  bienReference: string | null;
  annule: boolean;
};

function debutDeJourneeSqlite(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

export function getEnvoisWhatsappDuJour(): EnvoiDuJour[] {
  const rows = db
    .prepare(
      `SELECT e.*, c.nom AS contactNom, c.prenom AS contactPrenom, b.reference AS bienReference,
         EXISTS (SELECT 1 FROM Evenement a WHERE a.typeEvenement = 'whatsapp_non_envoye' AND a.evenementLieId = e.id) AS annule
       FROM Evenement e
       LEFT JOIN Contact c ON c.id = e.contactId
       LEFT JOIN Bien b ON b.id = e.bienId
       WHERE e.typeEvenement = 'whatsapp_envoye' AND julianday(e.dateEvenement) >= julianday(?)
       ORDER BY julianday(e.dateEvenement) DESC`
    )
    .all(debutDeJourneeSqlite()) as any[];
  return rows.map((r) => ({ ...r, annule: toBool(r.annule) }));
}

export function getEvenementsForBien(bienId: string): Evenement[] {
  return db
    .prepare(`SELECT * FROM Evenement WHERE bienId = ? ORDER BY dateEvenement DESC`)
    .all(bienId) as Evenement[];
}

// ---------------------------------------------------------------------------
// Rapprochement — schéma à paliers (cadrage §3 + précisions Seb du 19/09/2026) :
//   - surface : un bien sous la surface min. demandée
//       0 à 15 %   → « proche du critère »
//       15 à 30 %  → « élargi » (remonte quand même, mis en évidence à part)
//       > 30 %     → exclu
//   - prix : uniquement pour un bien plus grand que la surface min. demandée
//     (un bien plus grand coûte naturellement plus cher — ce n'est pas
//     éliminatoire si le budget reste globalement respecté), même paliers
//     au-dessus du budget max : 0-15 % proche, 15-30 % élargi, > 30 % exclu.
//     Un bien plus cher qui n'est PAS plus grand n'a droit à aucune
//     tolérance (dépassement direct = exclu).
// Le niveau retenu pour un bien est le plus défavorable des deux (surface,
// prix).
// ---------------------------------------------------------------------------

export type NiveauCorrespondance = "correspond" | "proche" | "elargi" | "hors_critere";

export interface MatchResult {
  bien: Bien;
  correspondance: NiveauCorrespondance;
  raison: string;
}

type Niveau = 0 | 1 | 2 | 3; // correspond / proche / elargi / exclu

function niveauEcart(ecart: number): Niveau {
  // ecart = fraction de dépassement (ex: 0.12 = 12 % en dessous / au-dessus)
  if (ecart <= 0) return 0;
  if (ecart <= 0.15) return 1;
  if (ecart <= 0.3) return 2;
  return 3;
}

const NIVEAU_LABEL: Record<Niveau, NiveauCorrespondance> = {
  0: "correspond",
  1: "proche",
  2: "elargi",
  3: "hors_critere",
};

interface EvaluationSurfacePrix {
  niveau: Niveau;
  raison: string;
}

function evaluerSurfacePrix(bien: Bien, recherche: Recherche): EvaluationSurfacePrix {
  let niveauSurface: Niveau = 0;
  let bienPlusGrand = false;

  if (recherche.surfaceSolMin && bien.surfaceSol) {
    const ecart = (recherche.surfaceSolMin - bien.surfaceSol) / recherche.surfaceSolMin;
    niveauSurface = niveauEcart(ecart);
    bienPlusGrand = bien.surfaceSol > recherche.surfaceSolMin;
  }

  let niveauPrix: Niveau = 0;
  if (recherche.budgetMax && bien.prixVente) {
    if (bienPlusGrand) {
      const ecart = (bien.prixVente - recherche.budgetMax) / recherche.budgetMax;
      niveauPrix = niveauEcart(ecart);
    } else if (bien.prixVente > recherche.budgetMax) {
      // Pas plus grand : aucune tolérance sur un dépassement de prix.
      niveauPrix = 3;
    }
  }

  const niveau = Math.max(niveauSurface, niveauPrix) as Niveau;

  const raisons: string[] = [];
  if (niveauSurface >= 1) {
    raisons.push(
      niveauSurface === 3
        ? "Surface insuffisante"
        : `Surface ${niveauSurface === 2 ? "nettement " : "légèrement "}sous le minimum (${
            niveauSurface === 2 ? "15-30 %" : "0-15 %"
          })`
    );
  }
  if (niveauPrix >= 1) {
    raisons.push(
      niveauPrix === 3
        ? "Prix au-dessus du budget"
        : `Bien plus grand, prix ${niveauPrix === 2 ? "nettement " : "légèrement "}au-dessus du budget (${
            niveauPrix === 2 ? "15-30 %" : "0-15 %"
          })`
    );
  }

  return {
    niveau,
    raison: raisons.length > 0 ? raisons.join(" · ") : "Correspond aux critères",
  };
}

export interface OptionsRapprochement {
  // Par défaut, les biens hors critère (type différent, hors quartier, ou
  // écart > 30 % en surface/prix) sont masqués. Seb peut demander à les voir.
  includeExclus?: boolean;
}

export function matchBiensPourRecherche(
  recherche: Recherche,
  options: OptionsRapprochement = {}
): MatchResult[] {
  const biens = listBiens().filter((b) => b.diffusionEtat !== "archive");
  const results: MatchResult[] = [];

  for (const bien of biens) {
    if (recherche.typeBien && bien.typeBien !== recherche.typeBien) {
      if (options.includeExclus) {
        results.push({ bien, correspondance: "hors_critere", raison: "Type de bien différent" });
      }
      continue;
    }
    if (
      recherche.quartierId &&
      bien.quartierId !== recherche.quartierId &&
      !isSousQuartierDe(bien.quartierId, recherche.quartierId)
    ) {
      if (options.includeExclus) {
        results.push({ bien, correspondance: "hors_critere", raison: "Hors quartier recherché" });
      }
      continue;
    }

    const evaluation = evaluerSurfacePrix(bien, recherche);
    if (evaluation.niveau === 3 && !options.includeExclus) continue;

    results.push({
      bien,
      correspondance: NIVEAU_LABEL[evaluation.niveau],
      raison: evaluation.raison,
    });
  }
  const ordre: Record<NiveauCorrespondance, number> = { correspond: 0, proche: 1, elargi: 2, hors_critere: 3 };
  return results.sort((a, b) => ordre[a.correspondance] - ordre[b.correspondance]);
}

export function matchRecherchesPourBien(
  bien: Bien,
  options: OptionsRapprochement = {}
): (MatchResult & { recherche: Recherche })[] {
  const recherches = db.prepare(`SELECT * FROM Recherche WHERE statut = 'actif'`).all().map(mapRecherche);
  const results: (MatchResult & { recherche: Recherche })[] = [];

  for (const recherche of recherches) {
    if (recherche.typeBien && bien.typeBien !== recherche.typeBien) {
      if (options.includeExclus) {
        results.push({ bien, recherche, correspondance: "hors_critere", raison: "Type de bien différent" });
      }
      continue;
    }

    let correspondance: NiveauCorrespondance = "correspond";
    let raison = "Correspond aux critères";
    let exclu = false;

    if (
      recherche.quartierId &&
      bien.quartierId !== recherche.quartierId &&
      !isSousQuartierDe(bien.quartierId, recherche.quartierId)
    ) {
      correspondance = "hors_critere";
      raison = "Hors quartier recherché";
      exclu = true;
    } else {
      const evaluation = evaluerSurfacePrix(bien, recherche);
      correspondance = NIVEAU_LABEL[evaluation.niveau];
      raison = evaluation.raison;
      exclu = evaluation.niveau === 3;
    }
    if (exclu && !options.includeExclus) continue;
    results.push({ bien, recherche, correspondance, raison });
  }
  const ordre: Record<NiveauCorrespondance, number> = { correspond: 0, proche: 1, elargi: 2, hors_critere: 3 };
  return results.sort((a, b) => ordre[a.correspondance] - ordre[b.correspondance]);
}

function isSousQuartierDe(quartierId: string | null, parentId: string): boolean {
  if (!quartierId) return false;
  const q = db.prepare(`SELECT quartierParentId FROM Quartier WHERE id = ?`).get(quartierId) as any;
  return !!q && q.quartierParentId === parentId;
}

// ---------------------------------------------------------------------------
// Ma journée
// ---------------------------------------------------------------------------

export function getDemandesSansReponse(): Demande[] {
  return db
    .prepare(`SELECT * FROM Demande WHERE dateReponse IS NULL ORDER BY dateReception ASC`)
    .all()
    .map(mapDemande);
}

export function getQuartiersSansTexte(): Quartier[] {
  return db
    .prepare(`SELECT * FROM Quartier WHERE texteIntroductionPublie = 0 AND datePremierSignalement IS NOT NULL`)
    .all()
    .map((r: any) => ({ ...r, texteIntroductionPublie: toBool(r.texteIntroductionPublie) }));
}

export function getBiensRetiresARelancer(): Bien[] {
  return db
    .prepare(`${BIEN_SELECT} WHERE b.statutCommercial = 'retire' ORDER BY b.updatedAt ASC`)
    .all()
    .map(mapBien);
}

export interface ClientAbouti {
  contact: Contact;
  bien: Bien | null;
  dateVente: string | null;
}

export function getClientsAboutisARelancer(): ClientAbouti[] {
  const rows = db
    .prepare(
      `SELECT c.*, b.id as bienId2, b.reference as bienRef
       FROM Contact c
       LEFT JOIN Bien b ON b.acheteurId = c.id
       WHERE c.statut = 'abouti'`
    )
    .all() as any[];
  return rows.map((r) => ({
    contact: mapContact(r),
    bien: r.bienId2 ? (getBien(r.bienId2) ?? null) : null,
    dateVente: r.dateDernierContact,
  }));
}

export function heuresDepuis(dateIso: string): number {
  // Même règle que lib/format.ts : une date SQLite sans fuseau est en UTC.
  const texte = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(dateIso) ? dateIso.replace(" ", "T") + "Z" : dateIso;
  return (Date.now() - new Date(texte).getTime()) / 3_600_000;
}

// ---------------------------------------------------------------------------
// Bons de visite et visites (A30/A31 — claude/CRM_LAM_schema_donnees.md §8-10)
// ---------------------------------------------------------------------------

function mapBonVisite(row: any): BonVisite {
  return { ...row, signe: toBool(row.signe) } as BonVisite;
}

function mapVisite(row: any): Visite {
  return {
    ...row,
    pieceIdentiteVue: toBool(row.pieceIdentiteVue),
    motifs: row.motifs ? JSON.parse(row.motifs) : null,
  } as Visite;
}

export function getBonVisite(id: string): BonVisite | undefined {
  const row = db.prepare(`SELECT * FROM BonVisite WHERE id = ?`).get(id);
  return row ? mapBonVisite(row) : undefined;
}

export function getBonsVisitePourContact(contactId: string): BonVisite[] {
  return db
    .prepare(`SELECT * FROM BonVisite WHERE contactId = ? ORDER BY dateCreation DESC`)
    .all(contactId)
    .map(mapBonVisite);
}

export function getBonVisiteLignes(bonVisiteId: string): (BonVisiteLigne & { bien: Bien })[] {
  const rows = db
    .prepare(`SELECT * FROM BonVisiteLigne WHERE bonVisiteId = ? ORDER BY dateLigne ASC`)
    .all(bonVisiteId) as any[];
  return rows
    .map((r) => {
      const bien = getBien(r.bienId);
      if (!bien) return null;
      return { ...r, paraphe: toBool(r.paraphe), bien } as BonVisiteLigne & { bien: Bien };
    })
    .filter((l): l is BonVisiteLigne & { bien: Bien } => !!l);
}

export function getVisitesPourLigne(bonVisiteLigneId: string): Visite[] {
  return db
    .prepare(`SELECT * FROM Visite WHERE bonVisiteLigneId = ? ORDER BY dateVisite DESC`)
    .all(bonVisiteLigneId)
    .map(mapVisite);
}

// Toutes les visites d'un bien, tous bons de visite confondus — sert au
// compte rendu vendeur (A31 : « rendre compte des démarches », art. 6 du
// mandat V3.1). Le nom de l'acquéreur n'est jamais restitué au vendeur,
// mais on le garde ici pour l'écran interne.
export function getVisitesPourBien(
  bienId: string
): (Visite & { dateLigne: string; contactId: string; contactNom: string })[] {
  const rows = db
    .prepare(
      `SELECT v.*, bl.dateLigne, bv.contactId, c.prenom as contactPrenom, c.nom as contactNom
       FROM Visite v
       JOIN BonVisiteLigne bl ON bl.id = v.bonVisiteLigneId
       JOIN BonVisite bv ON bv.id = bl.bonVisiteId
       JOIN Contact c ON c.id = bv.contactId
       WHERE bl.bienId = ?
       ORDER BY v.dateVisite DESC`
    )
    .all(bienId) as any[];
  return rows.map((r) => ({
    ...mapVisite(r),
    dateLigne: r.dateLigne,
    contactId: r.contactId,
    contactNom: r.contactPrenom ? `${r.contactPrenom} ${r.contactNom}` : r.contactNom,
  }));
}
