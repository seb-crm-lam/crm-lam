export function formatDh(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return new Intl.NumberFormat("fr-FR").format(n) + " DH";
}

export function formatM2(n: number | null | undefined): string {
  if (n === null || n === undefined) return "—";
  return `${n} m²`;
}

// SQLite écrit ses dates « 2026-09-24 08:36:40 », en UTC mais sans le dire :
// lues telles quelles, elles seraient prises pour l'heure locale (1 h d'écart
// à Marrakech). On les marque UTC avant lecture.
function lireDate(iso: string): Date {
  return new Date(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(iso) ? iso.replace(" ", "T") + "Z" : iso);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = lireDate(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(d);
}

export function formatDateHeure(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = lireDate(iso);
  if (isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function heuresDepuisTexte(iso: string): string {
  const h = (Date.now() - lireDate(iso).getTime()) / 3_600_000;
  if (h < 1) return "< 1 h";
  if (h < 48) return `${Math.floor(h)} h`;
  return `${Math.floor(h / 24)} j`;
}

export const TYPE_BIEN_LABELS: Record<string, string> = {
  riad: "Riad",
  villa: "Villa",
  appartement: "Appartement",
  terrain: "Terrain",
  fonds_commerce: "Fonds de commerce",
};

// Souhait d'état du bien dans une recherche (26 octobre 2026).
export const ETAT_RECHERCHE_LABELS: Record<string, string> = {
  en_exploitation: "En exploitation",
  autre: "Autre (à rénover, semi-fini ou à démolir)",
};

// Fourchette de surface d'une recherche : « 80 – 100 m² », « à partir de 80 m² »…
export function formatFourchetteM2(min: number | null | undefined, max: number | null | undefined): string {
  const aMin = min !== null && min !== undefined;
  const aMax = max !== null && max !== undefined;
  if (aMin && aMax) return `${min} – ${max} m²`;
  if (aMin) return `à partir de ${min} m²`;
  if (aMax) return `jusqu'à ${max} m²`;
  return "—";
}

// Fourchette de chambres d'une recherche : « 3 – 5 chambres », « au moins 3 chambres »…
export function formatFourchetteChambres(min: number | null | undefined, max: number | null | undefined): string {
  const aMin = min !== null && min !== undefined;
  const aMax = max !== null && max !== undefined;
  if (aMin && aMax) return min === max ? `${min} chambre${min > 1 ? "s" : ""}` : `${min} – ${max} chambres`;
  if (aMin) return `au moins ${min} chambre${min > 1 ? "s" : ""}`;
  if (aMax) return `${max} chambre${max > 1 ? "s" : ""} maximum`;
  return "—";
}

export const TRANSACTION_LABELS: Record<string, string> = {
  vente: "Vente",
  location_longue_duree: "Location longue durée",
};

export const DIFFUSION_LABELS: Record<string, string> = {
  brouillon: "Brouillon",
  off_market: "Off-market",
  publie: "Publié",
  publie_hors_catalogue: "Publié hors catalogue",
  archive: "Archivé",
};

export const STATUT_COMMERCIAL_LABELS: Record<string, string> = {
  disponible: "Disponible",
  sous_promesse: "Sous promesse (notaire ou adoul)",
  vendu: "Vendu",
  loue: "Loué",
  retire: "Retiré",
};

export const VERDICT_VISITE_LABELS: Record<string, string> = {
  coup_de_coeur: "Coup de cœur",
  interesse: "Intéressé",
  a_revoir: "À revoir",
  ecarte: "Écarté",
};

export const MOTIF_VISITE_LABELS: Record<string, string> = {
  prix: "Prix",
  travaux: "Travaux",
  surface: "Surface",
  quartier: "Quartier",
  acces_vehicule: "Accès véhicule",
  luminosite: "Luminosité",
  humidite: "Humidité",
  bruit: "Bruit",
  vis_a_vis: "Vis-à-vis",
  agencement: "Agencement",
  statut_juridique: "Statut juridique",
};

export const SUITE_VISITE_LABELS: Record<string, string> = {
  relance_a_date: "Relance à date",
  seconde_visite: "Seconde visite",
  offre_a_venir: "Offre à venir",
  rien: "Rien",
};

// Mandat V3.1, article 1 — ajouté au CRM le 25 septembre 2026 (décision 3C/A).
export const QUALITE_MANDANT_LABELS: Record<string, string> = {
  proprietaire: "Propriétaire",
  co_indivisaire: "Co-indivisaire",
  representant_societe: "Représentant d'une société",
  mandataire_habilite: "Mandataire habilité",
};

// A22 (14 septembre) — ce qui est vendu, pour un fonds de commerce.
export const NATURE_VENTE_LABELS: Record<string, string> = {
  murs: "Murs",
  fonds: "Fonds",
  murs_et_fonds: "Murs et fonds",
};

// A22 (14 septembre) — si l'affaire tourne, pour un fonds de commerce.
export const ETAT_EXPLOITATION_LABELS: Record<string, string> = {
  en_activite: "En activité",
  en_cessation: "En cessation",
};

// Origine du bien — liste fermée. « RDS » retiré le 26 septembre 2026
// (sujet clos, claude/CRM_LAM_decisions_26_septembre.md).
export const TYPE_ORIGINE_LABELS: Record<string, string> = {
  demarchage: "Démarchage",
  samsar: "Samsar",
  recommandation_client: "Recommandation client",
  confrere: "Confrère",
  autre: "Autre",
};

// Type d'apporteur d'un contact : même liste que l'origine du bien (validée
// par Seb le 16 octobre 2026, « telle quelle »).
export const TYPE_APPORTEUR_LABELS = TYPE_ORIGINE_LABELS;

// Ce qu'apporte un apporteur — menu à la main (16 octobre 2026).
export const APPORT_CATEGORIE_LABELS: Record<string, string> = {
  biens: "Biens",
  clients: "Clients",
  les_deux: "Les deux",
};

// Équipement d'un fonds de commerce (§11 champs_bien_et_contact.md).
export const EQUIPEMENT_LABELS: Record<string, string> = {
  equipe: "Équipé",
  chambre_froide: "Chambre froide",
  gaz: "Gaz",
  climatisation: "Climatisation / chauffage",
};

export const TYPE_DOCUMENT_LABELS: Record<string, string> = {
  mandat: "Mandat",
  bon_visite: "Bon de visite",
  engagement_confidentialite: "Engagement de confidentialité",
  compte_rendu: "Compte rendu vendeur",
};

// Groupes de prestations — libellés et ordre du site (note du 26 septembre).
// Les groupes classent les cases ; ils ne se cochent pas.
export const GROUPES_PRESTATION: { code: string; label: string }[] = [
  { code: "exterieurs", label: "Extérieurs" },
  { code: "interieurs", label: "Intérieurs" },
  { code: "equipements", label: "Équipements" },
  { code: "situation", label: "Situation" },
];

export const GROUPE_PRESTATION_LABELS: Record<string, string> = Object.fromEntries(
  GROUPES_PRESTATION.map((g) => [g.code, g.label])
);
