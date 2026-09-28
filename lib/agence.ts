// Coordonnées de l'agence reprises sur les documents remis aux clients.
// Aucune valeur inventée : tant que le numéro WhatsApp de l'agence n'est pas
// renseigné (variable LAM_WHATSAPP_AGENCE dans le fichier .env), la fiche
// n'affiche que le nom du conseiller.
export const CONSEILLER_PAR_DEFAUT = "Sébastien"; // cadrage §11 : vide → « Sébastien »
export const AGENCE_WHATSAPP: string | null = process.env.LAM_WHATSAPP_AGENCE?.trim() || null;
