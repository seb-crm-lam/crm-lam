-- Schéma SQLite du prototype CRM LAM.
-- Traduit du schéma de référence prisma/schema.prisma, lui-même traduit
-- terme à terme de claude/CRM_LAM_schema_donnees.md (validé le 19/09/2026).
-- Pour la vraie mise en production (Supabase/Postgres), utiliser
-- prisma/schema.prisma comme source de vérité — ce fichier est seulement
-- le support de ce prototype local.

CREATE TABLE IF NOT EXISTS Quartier (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  quartierParentId TEXT REFERENCES Quartier(id),
  texteIntroductionPublie INTEGER NOT NULL DEFAULT 0,
  datePremierSignalement TEXT
);

CREATE TABLE IF NOT EXISTS Prestation (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  groupe TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Contact (
  id TEXT PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT,
  telephone TEXT,
  email TEXT,
  cinPasseport TEXT,
  adressePostale TEXT,
  agitPourLeCompteDe TEXT,
  formeAdresse TEXT NOT NULL DEFAULT 'vous',
  statut TEXT NOT NULL DEFAULT 'nouveau',
  motifDeSortie TEXT,
  consentementProspection INTEGER NOT NULL DEFAULT 0,
  dateConsentement TEXT,
  origineConsentement TEXT,
  texteConsentement TEXT,
  accordReponse INTEGER NOT NULL DEFAULT 0,
  dateAccordReponse TEXT,
  texteAccordReponse TEXT,
  dateDernierContact TEXT,
  anonymise INTEGER NOT NULL DEFAULT 0,
  dateAnonymisation TEXT
);

CREATE TABLE IF NOT EXISTS Bien (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  titre TEXT NOT NULL,
  description TEXT,
  typeBien TEXT NOT NULL,
  transaction_ TEXT NOT NULL,

  ville TEXT NOT NULL DEFAULT 'Marrakech',
  quartierId TEXT REFERENCES Quartier(id),
  situation TEXT,
  adresseExacte TEXT,
  latitudeExacte REAL,
  longitudeExacte REAL,
  latitudePubliee REAL,
  longitudePubliee REAL,
  statutJuridique TEXT,
  numeroTitre TEXT,

  etatBien TEXT,
  modeExploitation TEXT,
  surfaceSol REAL,
  surfaceHabitable REAL,
  surfaceDeveloppee REAL,
  surfaceTerrain REAL,
  chambres INTEGER,
  sallesBain INTEGER,
  niveaux INTEGER,
  etage INTEGER,
  terrainViabilise INTEGER,
  constructible INTEGER,

  licenceExploitationTouristique INTEGER NOT NULL DEFAULT 0,

  prixVente REAL,
  prixSurDemande INTEGER NOT NULL DEFAULT 0,
  prixPlancher REAL,
  honorairesPourcentage REAL,
  honorairesMinimumDh REAL,
  honorairesCharge TEXT,
  afficherPrixM2 INTEGER NOT NULL DEFAULT 0,
  loyerMensuel REAL,
  chargesMensuelles REAL,
  natureVente TEXT,
  piecesFonds INTEGER,
  qualiteMandant TEXT,
  prixFonds REAL,
  prixMurs REAL,

  etatExploitation TEXT,
  activite TEXT,
  capaciteValeur INTEGER,
  capaciteUnite TEXT,
  salaries INTEGER,
  joursOuverture TEXT,
  horairesOuverture TEXT,
  licenceAlcool INTEGER,
  droitTerrasse INTEGER,
  autorisationExploitation INTEGER,
  autorisationExploitationActivite TEXT,
  equipement TEXT,

  exclusivite INTEGER NOT NULL DEFAULT 0,
  mentionEditoriale TEXT,
  solutionCleEnMainChiffree INTEGER NOT NULL DEFAULT 0,

  diffusionEtat TEXT NOT NULL DEFAULT 'brouillon',
  statutCommercial TEXT NOT NULL DEFAULT 'disponible',
  motifDeSortie TEXT,

  conseillerReferent TEXT,
  notesInternes TEXT,

  proprietaireId TEXT REFERENCES Contact(id),
  apporteurId TEXT REFERENCES Contact(id),
  apporteurProcurationAuthentique INTEGER,
  typeOrigine TEXT,
  acheteurId TEXT REFERENCES Contact(id),

  estimationAgence REAL,
  estimationDate TEXT,
  estimationFondement TEXT,
  contactAcces TEXT,
  contactAccesTelephone TEXT,
  accesPreavis TEXT,
  accesCreneaux TEXT,
  clesConfiees INTEGER,
  clesReferenceRecu TEXT,
  partageConfrere INTEGER,
  partageConditions TEXT,
  frequenceCompteRendu TEXT,
  commissionTauxOuMontant TEXT,
  commissionALaChargeDe TEXT,
  commissionNote TEXT,

  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  datePublication TEXT
);

CREATE TABLE IF NOT EXISTS BienPhoto (
  id TEXT PRIMARY KEY,
  bienId TEXT NOT NULL REFERENCES Bien(id),
  cheminOriginal TEXT NOT NULL,
  cheminWeb TEXT NOT NULL,
  ordre INTEGER NOT NULL DEFAULT 0,
  texteAlternatif TEXT,
  exifNettoye INTEGER NOT NULL DEFAULT 0,
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS BienPrestation (
  bienId TEXT NOT NULL REFERENCES Bien(id),
  prestationId TEXT NOT NULL REFERENCES Prestation(id),
  PRIMARY KEY (bienId, prestationId)
);

CREATE TABLE IF NOT EXISTS Recherche (
  id TEXT PRIMARY KEY,
  contactId TEXT NOT NULL REFERENCES Contact(id),
  typeBien TEXT,
  quartierId TEXT REFERENCES Quartier(id),
  surfaceSolMin REAL,
  budgetMax REAL,
  modeExploitationRecherche TEXT,
  messageProspect TEXT,
  criteresLibres TEXT,
  statut TEXT NOT NULL DEFAULT 'actif',
  createdAt TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS BonVisite (
  id TEXT PRIMARY KEY,
  reference TEXT NOT NULL UNIQUE,
  contactId TEXT NOT NULL REFERENCES Contact(id),
  agent TEXT,
  lieu TEXT,
  dateCreation TEXT NOT NULL DEFAULT (datetime('now')),
  signe INTEGER NOT NULL DEFAULT 0,
  dateSignature TEXT,
  photoPapier TEXT
);

CREATE TABLE IF NOT EXISTS BonVisiteLigne (
  id TEXT PRIMARY KEY,
  bonVisiteId TEXT NOT NULL REFERENCES BonVisite(id),
  bienId TEXT NOT NULL REFERENCES Bien(id),
  dateLigne TEXT NOT NULL DEFAULT (datetime('now')),
  paraphe INTEGER NOT NULL DEFAULT 0,
  honorairesAcquereurPourcentage REAL,
  finNonContournement TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Visite (
  id TEXT PRIMARY KEY,
  bonVisiteLigneId TEXT NOT NULL REFERENCES BonVisiteLigne(id),
  dateVisite TEXT NOT NULL DEFAULT (datetime('now')),
  pieceIdentiteVue INTEGER NOT NULL DEFAULT 0,
  verdict TEXT,
  motifs TEXT,
  noteLibre TEXT,
  objectionPrix REAL,
  suite TEXT,
  dateRelance TEXT
);

CREATE TABLE IF NOT EXISTS Document (
  id TEXT PRIMARY KEY,
  typeDocument TEXT NOT NULL,
  bienId TEXT REFERENCES Bien(id),
  contactId TEXT REFERENCES Contact(id),
  modeleVersion TEXT,
  dateGeneration TEXT NOT NULL DEFAULT (datetime('now')),
  signe INTEGER NOT NULL DEFAULT 0,
  dateSignature TEXT,
  photoPapier TEXT,
  fichierPdf TEXT
);

CREATE TABLE IF NOT EXISTS Demande (
  id TEXT PRIMARY KEY,
  typeDemande TEXT NOT NULL,
  nom TEXT,
  email TEXT,
  telephone TEXT,
  bienId TEXT REFERENCES Bien(id),
  message TEXT,
  lu INTEGER NOT NULL DEFAULT 0,
  dateReception TEXT NOT NULL DEFAULT (datetime('now')),
  dateReponse TEXT,
  alerteEnvoyee INTEGER NOT NULL DEFAULT 0,
  typeBienEstime TEXT,
  quartierTexte TEXT,
  surfaceTexte TEXT,
  statutTitreEstime TEXT,
  exploite INTEGER
);

CREATE TABLE IF NOT EXISTS PieceDossier (
  id TEXT PRIMARY KEY,
  bienId TEXT NOT NULL REFERENCES Bien(id),
  pieceKey TEXT NOT NULL,
  recueLe TEXT,
  conforme INTEGER,
  relanceDemandee INTEGER NOT NULL DEFAULT 0,
  updatedAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(bienId, pieceKey)
);

CREATE TABLE IF NOT EXISTS Evenement (
  id TEXT PRIMARY KEY,
  contactId TEXT REFERENCES Contact(id),
  bienId TEXT REFERENCES Bien(id),
  typeEvenement TEXT NOT NULL,
  dateEvenement TEXT NOT NULL DEFAULT (datetime('now')),
  detail TEXT,
  auteur TEXT,
  evenementLieId TEXT
);

-- 28 septembre 2026 — compte de connexion (Seb seul) : e-mail, mot de passe
-- haché (scrypt), secret du code de vérification (application de codes).
CREATE TABLE IF NOT EXISTS Utilisateur (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  motDePasseHash TEXT NOT NULL,
  totpSecret TEXT NOT NULL,
  dateCreation TEXT NOT NULL
);
