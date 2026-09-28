// Catalogue du dossier de pièces vendeur — liste fermée, définie une fois
// pour toutes dans le code (comme les motifs de visite), jamais saisie
// librement. Source : claude/RECU_note_site_LAM_11_septembre.md §9,
// document « Dossier_de_pieces_du_vendeur.md » du 11 septembre 2026.
//
// Trois niveaux, chacun bloquant une étape différente (A25) :
//   1 = bloque la diffusion (site, portails, réseaux)
//   2 = bloque la transmission d'une offre
//   3 = bloque le rendez-vous chez le notaire
//
// Ce suivi reste pour l'instant SÉPARÉ du feu vert de publication
// (calculerFeuVert), qui a ses propres critères déjà en place (mandat
// signé, statut juridique...). Relier automatiquement le niveau 1 complet
// au feu vert est une décision structurante à part, non prise ici — à
// proposer à Seb séparément si utile.

export type BlocPieces = "base" | "societe" | "fonds";

export interface PieceCatalogue {
  key: string;
  niveau: 1 | 2 | 3;
  nom: string;
  bloc?: BlocPieces; // absent = base (tous les biens)
}

export const PIECES_DOSSIER: PieceCatalogue[] = [
  // Niveau 1 — bloque la diffusion
  { key: "titre", niveau: 1, nom: "Titre foncier / melkia" },
  { key: "certificat_propriete", niveau: 1, nom: "Certificat de propriété (< 3 mois)" },
  { key: "identites", niveau: 1, nom: "Identités (CIN / passeport)" },
  { key: "acte_heredite", niveau: 1, nom: "Acte d'hérédité (si applicable)" },
  { key: "procuration", niveau: 1, nom: "Procuration (si applicable)" },
  { key: "mandat_signe", niveau: 1, nom: "Mandat signé par tous" },
  { key: "autorisation_diffusion", niveau: 1, nom: "Autorisation de diffusion" },

  // Niveau 2 — bloque la transmission d'une offre
  { key: "plans", niveau: 2, nom: "Plans" },
  { key: "urbanisme", niveau: 2, nom: "Urbanisme" },
  { key: "copropriete", niveau: 2, nom: "Copropriété" },
  { key: "bail", niveau: 2, nom: "Bail (si occupé)" },
  { key: "factures_travaux", niveau: 2, nom: "Factures de travaux" },
  // Ajouté le 25 septembre 2026 — présent dans la liste remise au vendeur
  // (Dossier_de_pieces_du_vendeur_LAM.pdf p. 1, niveau 2), « si à rénover ».
  { key: "diagnostic_travaux", niveau: 2, nom: "Diagnostic ou devis de travaux (si à rénover)" },

  // Niveau 3 — bloque le rendez-vous chez le notaire
  // Séparées le 25 septembre 2026, comme dans le suivi interne du PDF (p. 3).
  { key: "quittances_taxes", niveau: 3, nom: "Quittances taxes d'habitation et services communaux" },
  { key: "quittances_eau_electricite", niveau: 3, nom: "Quittances eau et électricité" },
  { key: "quitus_syndic", niveau: 3, nom: "Quitus du syndic" },
  { key: "mainlevee", niveau: 3, nom: "Mainlevée (si hypothèque)" },
  { key: "justificatif_devises", niveau: 3, nom: "Justificatif d'acquisition en devises (non-résident)" },
  { key: "rib", niveau: 3, nom: "RIB" },

  // Bloc « société vendeuse » — ajouté le 25 septembre 2026. Source :
  // Dossier_de_pieces_du_vendeur_LAM.pdf, suivi interne p. 3
  // (claude/RECU_Dossier_de_pieces_du_vendeur_LAM.md). Affiché quand la
  // qualité du mandant est « représentant d'une société » (décision 3C/A).
  { key: "societe_statuts", niveau: 1, nom: "Statuts à jour", bloc: "societe" },
  { key: "societe_modele_j", niveau: 1, nom: "Modèle J de moins de 3 mois", bloc: "societe" },
  { key: "societe_decision_vente", niveau: 1, nom: "Décision autorisant la vente (PV du CA pour une SA, décision des associés pour une SARL ou une SCI)", bloc: "societe" },
  { key: "societe_cin_representant", niveau: 1, nom: "CIN du représentant signataire", bloc: "societe" },
  { key: "societe_beneficiaires", niveau: 1, nom: "Déclaration des bénéficiaires effectifs", bloc: "societe" },

  // Bloc « fonds de commerce, le cas échéant » — même source, p. 3-4.
  // Affiché selon la case de la fiche du bien (décision 3C).
  { key: "fonds_modele_j", niveau: 1, nom: "Modèle J du fonds (moins de 3 mois)", bloc: "fonds" },
  { key: "fonds_autorisation", niveau: 1, nom: "Autorisation d'exploitation et classement", bloc: "fonds" },
  { key: "fonds_comptes", niveau: 1, nom: "Comptes des trois derniers exercices", bloc: "fonds" },
  { key: "fonds_inscriptions_rc", niveau: 1, nom: "État des inscriptions au RC (nantissements)", bloc: "fonds" },
  { key: "fonds_bail", niveau: 1, nom: "Bail commercial et accord du bailleur (si murs loués)", bloc: "fonds" },
  { key: "fonds_fiscal_cnss", niveau: 2, nom: "Attestation fiscale et attestation CNSS", bloc: "fonds" },
  { key: "fonds_contrats_travail", niveau: 2, nom: "Contrats de travail du personnel", bloc: "fonds" },
  { key: "fonds_contrats_cours", niveau: 2, nom: "Contrats OTA, assurances, prestataires", bloc: "fonds" },
  { key: "fonds_reservations", niveau: 2, nom: "État des réservations encaissées", bloc: "fonds" },
];

export const BLOC_LABELS: Record<BlocPieces, string> = {
  base: "",
  societe: "Société vendeuse",
  fonds: "Fonds de commerce",
};

// Bloc « société » : automatique, d'après la qualité du mandant (3C/A).
export function blocSocieteActif(bien: { qualiteMandant: string | null }): boolean {
  return bien.qualiteMandant === "representant_societe";
}

// Bloc « fonds » : cochée d'office pour un fonds de commerce vendu « fonds »
// ou « murs et fonds » ; Seb peut cocher ou décocher (3C).
export function blocFondsParDefaut(bien: { typeBien: string; natureVente: string | null }): boolean {
  return bien.typeBien === "fonds_commerce" && (bien.natureVente === "fonds" || bien.natureVente === "murs_et_fonds");
}
export function blocFondsActif(bien: { typeBien: string; natureVente: string | null; piecesFonds: boolean | null }): boolean {
  return bien.piecesFonds ?? blocFondsParDefaut(bien);
}

export const NIVEAU_LABELS: Record<1 | 2 | 3, string> = {
  1: "Niveau 1 — bloque la diffusion",
  2: "Niveau 2 — bloque la transmission d'une offre",
  3: "Niveau 3 — bloque le rendez-vous chez le notaire",
};

