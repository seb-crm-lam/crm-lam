// Types du prototype — mêmes noms de champs que
// claude/CRM_LAM_schema_donnees.md (camelCase).

export type TypeBien = "riad" | "villa" | "appartement" | "terrain" | "fonds_commerce";
export type TransactionType = "vente" | "location_longue_duree";
export type EtatBien = "a_renover" | "en_exploitation" | null;
export type DiffusionEtat = "brouillon" | "off_market" | "publie" | "publie_hors_catalogue" | "archive";
export type StatutCommercial = "disponible" | "sous_promesse" | "vendu" | "loue" | "retire";

export interface Bien {
  id: string;
  reference: string;
  titre: string;
  description: string | null;
  typeBien: TypeBien;
  transaction: TransactionType;

  ville: string;
  quartierId: string | null;
  situation: string | null;
  adresseExacte: string | null;
  latitudeExacte: number | null;
  longitudeExacte: number | null;
  latitudePubliee: number | null;
  longitudePubliee: number | null;
  statutJuridique: string | null;
  numeroTitre: string | null;

  etatBien: EtatBien;
  modeExploitation: string | null;
  surfaceSol: number | null;
  surfaceHabitable: number | null;
  surfaceDeveloppee: number | null;
  surfaceTerrain: number | null;
  chambres: number | null;
  sallesBain: number | null;
  niveaux: number | null;
  etage: number | null;
  terrainViabilise: boolean | null;
  constructible: boolean | null;

  licenceExploitationTouristique: boolean;

  prixVente: number | null;
  prixSurDemande: boolean;
  prixPlancher: number | null;
  honorairesPourcentage: number | null;
  honorairesMinimumDh: number | null;
  honorairesCharge: string | null;
  afficherPrixM2: boolean;
  loyerMensuel: number | null;
  chargesMensuelles: number | null;
  natureVente: string | null;
  piecesFonds: boolean | null; // null = par défaut (voir blocFondsActif)
  qualiteMandant: string | null; // proprietaire|co_indivisaire|representant_societe|mandataire_habilite
  prixFonds: number | null;
  prixMurs: number | null;

  etatExploitation: string | null;
  activite: string | null;
  capaciteValeur: number | null;
  capaciteUnite: string | null;
  salaries: number | null;
  joursOuverture: string | null;
  horairesOuverture: string | null;
  licenceAlcool: boolean | null;
  droitTerrasse: boolean | null;
  autorisationExploitation: boolean | null;
  autorisationExploitationActivite: string | null;
  equipement: string[] | null;

  exclusivite: boolean;
  mentionEditoriale: string | null;
  solutionCleEnMainChiffree: boolean;

  diffusionEtat: DiffusionEtat;
  statutCommercial: StatutCommercial;
  motifDeSortie: string | null;

  conseillerReferent: string | null;
  notesInternes: string | null;

  proprietaireId: string | null;
  apporteurId: string | null;
  apporteurProcurationAuthentique: boolean | null;
  typeOrigine: string | null;
  acheteurId: string | null;

  estimationAgence: number | null;
  estimationDate: string | null;
  estimationFondement: string | null;
  contactAcces: string | null;
  contactAccesTelephone: string | null;
  accesPreavis: string | null;
  accesCreneaux: string | null;
  clesConfiees: boolean | null;
  clesReferenceRecu: string | null;
  partageConfrere: boolean | null;
  partageConditions: string | null;
  frequenceCompteRendu: string | null;
  commissionTauxOuMontant: string | null;
  commissionALaChargeDe: string | null;
  commissionNote: string | null;

  createdAt: string;
  updatedAt: string;
  datePublication: string | null;

  // jointures pratiques (pas des colonnes)
  quartierNom?: string | null;
}

export interface BienPhoto {
  id: string;
  bienId: string;
  cheminOriginal: string;
  cheminWeb: string;
  ordre: number;
  texteAlternatif: string | null;
  exifNettoye: boolean;
  createdAt: string;
}

export interface Quartier {
  id: string;
  nom: string;
  quartierParentId: string | null;
  texteIntroductionPublie: boolean;
  datePremierSignalement: string | null;
}

export interface Prestation {
  id: string;
  nom: string;
  groupe: string;
}

export interface Contact {
  id: string;
  nom: string;
  prenom: string | null;
  telephone: string | null;
  email: string | null;
  cinPasseport: string | null;
  adressePostale: string | null;
  agitPourLeCompteDe: string | null;
  formeAdresse: "vous" | "tu";
  statut: string;
  motifDeSortie: string | null;
  consentementProspection: boolean;
  dateConsentement: string | null;
  origineConsentement: string | null;
  texteConsentement: string | null;
  accordReponse: boolean;
  dateAccordReponse: string | null;
  texteAccordReponse: string | null;
  dateDernierContact: string | null;
  anonymise: boolean;
  dateAnonymisation: string | null;
}

export interface Recherche {
  id: string;
  contactId: string;
  typeBien: string | null;
  quartierId: string | null;
  surfaceSolMin: number | null;
  budgetMax: number | null;
  modeExploitationRecherche: string | null;
  messageProspect: string | null;
  criteresLibres: string | null;
  statut: string;
  createdAt: string;
  quartierNom?: string | null;
}

export interface PieceDossier {
  id: string;
  bienId: string;
  pieceKey: string;
  recueLe: string | null;
  conforme: boolean | null;
  relanceDemandee: boolean;
  updatedAt: string;
}

export interface Evenement {
  id: string;
  contactId: string | null;
  bienId: string | null;
  typeEvenement: string;
  dateEvenement: string;
  detail: string | null;
  auteur: string | null;
  evenementLieId?: string | null;
}

export interface Demande {
  id: string;
  typeDemande: string;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  bienId: string | null;
  message: string | null;
  lu: boolean;
  dateReception: string;
  dateReponse: string | null;
  alerteEnvoyee: boolean;
  typeBienEstime: string | null;
  quartierTexte: string | null;
  surfaceTexte: string | null;
  statutTitreEstime: string | null;
  exploite: boolean | null;
}

// ---------------------------------------------------------------------------
// Documents, bons de visite, visites — persistance A30/A31
// (claude/CRM_LAM_schema_donnees.md §7-10)
// ---------------------------------------------------------------------------

export type TypeDocument = "mandat" | "bon_visite" | "engagement_confidentialite" | "compte_rendu";

export interface Document {
  id: string;
  typeDocument: TypeDocument;
  bienId: string | null;
  contactId: string | null;
  modeleVersion: string | null;
  dateGeneration: string;
  signe: boolean;
  dateSignature: string | null;
  photoPapier: string | null;
  fichierPdf: string | null;
}

export interface BonVisite {
  id: string;
  reference: string;
  contactId: string;
  agent: string | null;
  lieu: string | null;
  dateCreation: string;
  signe: boolean;
  dateSignature: string | null;
  photoPapier: string | null;
}

export interface BonVisiteLigne {
  id: string;
  bonVisiteId: string;
  bienId: string;
  dateLigne: string;
  paraphe: boolean;
  honorairesAcquereurPourcentage: number | null;
  finNonContournement: string;
  // jointures pratiques
  bien?: Bien;
}

export type VerdictVisite = "coup_de_coeur" | "interesse" | "a_revoir" | "ecarte";
export type SuiteVisite = "relance_a_date" | "seconde_visite" | "offre_a_venir" | "rien";

export interface Visite {
  id: string;
  bonVisiteLigneId: string;
  dateVisite: string;
  pieceIdentiteVue: boolean;
  verdict: VerdictVisite | null;
  motifs: string[] | null;
  noteLibre: string | null;
  objectionPrix: number | null;
  suite: SuiteVisite | null;
  dateRelance: string | null;
}
