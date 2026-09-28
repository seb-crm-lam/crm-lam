// Fiche bien envoyée au client — décisions de Seb du 24 septembre 2026
// (claude/CRM_LAM_decisions_24_septembre.md) :
// - message WhatsApp court + fiche PDF d'une page ;
// - uniquement des informations publiques : jamais l'adresse exacte, le prix
//   plancher, les honoraires, ni la carte ;
// - points forts pré-remplis depuis les prestations, modifiables à l'envoi ;
// - vouvoiement ou tutoiement selon la fiche contact ;
// - bien off-market : mention « Bien présenté en toute discrétion, non publié. »

import type { Bien, BienPhoto, Prestation } from "@/lib/types";
import { TYPE_BIEN_LABELS } from "@/lib/format";
import { esc } from "./shared";

export const MENTION_OFF_MARKET = "Bien présenté en toute discrétion, non publié.";

const STATUT_JURIDIQUE_LABELS: Record<string, string> = {
  titre_foncier: "Titre foncier",
  melkia: "Melkia",
  en_requisition: "En réquisition",
};

function nombre(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(n).replace(/ | /g, " ");
}

// Surface qui vaut pour le type (cadrage §3 ; sur un riad, seule la surface
// au sol est publiée).
function surfacePrincipale(bien: Bien): number | null {
  switch (bien.typeBien) {
    case "riad":
    case "fonds_commerce":
      return bien.surfaceSol;
    case "villa":
      return bien.surfaceHabitable ?? bien.surfaceSol;
    case "appartement":
      return bien.surfaceHabitable;
    case "terrain":
      return bien.surfaceTerrain;
    default:
      return null;
  }
}

// Libellé court calculé — « LAM-0042 — Riad 220 m², Bab Doukkala ».
// Surface absente → « type · quartier ».
export function libelleCourt(bien: Bien): string {
  const type = TYPE_BIEN_LABELS[bien.typeBien] ?? bien.typeBien;
  const surface = surfacePrincipale(bien);
  const quartier = bien.quartierNom ?? "";
  const corps = surface ? `${type} ${nombre(surface)} m²` : type;
  return `${bien.reference} — ${corps}${quartier ? `, ${quartier}` : ""}`;
}

export function prixTexte(bien: Bien): string {
  if (bien.transaction === "location_longue_duree") {
    return bien.loyerMensuel ? `${nombre(bien.loyerMensuel)} MAD / mois` : "Loyer sur demande";
  }
  if (bien.prixSurDemande) return "Prix sur demande";
  if (bien.typeBien === "fonds_commerce") {
    const parts: string[] = [];
    if (bien.prixFonds) parts.push(`Fonds : ${nombre(bien.prixFonds)} MAD`);
    if (bien.prixMurs) parts.push(`Murs : ${nombre(bien.prixMurs)} MAD`);
    if (parts.length > 0) return parts.join(" · ");
  }
  return bien.prixVente ? `${nombre(bien.prixVente)} MAD` : "Prix sur demande";
}

function ligneprix(bien: Bien): string {
  const prix = prixTexte(bien);
  if (prix === "Prix sur demande" || prix === "Loyer sur demande" || prix.startsWith("Fonds") || prix.startsWith("Murs")) {
    return prix;
  }
  return bien.transaction === "location_longue_duree" ? `Loyer : ${prix}` : `Prix : ${prix}`;
}

export function pointsFortsParDefaut(prestations: Prestation[]): string[] {
  return prestations.slice(0, 3).map((p) => p.nom);
}

export function estOffMarket(bien: Bien): boolean {
  return bien.diffusionEtat === "off_market";
}

export function composerMessage(opts: {
  prenom: string | null;
  formeAdresse: "vous" | "tu";
  bien: Bien;
  pointsForts: string[];
  lienSite: string | null;
  conseiller: string;
}): string {
  const { prenom, formeAdresse, bien, pointsForts, lienSite, conseiller } = opts;
  const tu = formeAdresse === "tu";
  const offMarket = estOffMarket(bien);
  const lignes: string[] = [];
  lignes.push(prenom ? `Bonjour ${prenom},` : "Bonjour,");
  lignes.push(tu ? "Je te propose ce bien :" : "Je vous propose ce bien :");
  lignes.push(`*${libelleCourt(bien)}*`);
  lignes.push(ligneprix(bien));
  const points = pointsForts.map((p) => p.trim()).filter(Boolean);
  if (points.length > 0) lignes.push(points.map((p) => `• ${p}`).join(" "));
  if (offMarket) lignes.push(MENTION_OFF_MARKET);
  // Pas de lien vers le site pour un bien off-market, ni tant que le CRM ne
  // connaît pas l'adresse publique de la fiche (synchronisation à venir).
  if (!offMarket && lienSite) lignes.push(`Fiche complète : ${lienSite}`);
  else lignes.push("Fiche détaillée en pièce jointe.");
  lignes.push(`${conseiller} — L'Adresse Marrakchie`);
  return lignes.join("\n");
}

// Prépare ce que le composant d'envoi affiche : le message est découpé
// autour de la ligne des points forts, que Seb peut modifier avant l'envoi.
const JETON = "\u0000POINTS\u0000";

export function preparerEnvoi(opts: {
  bien: Bien;
  contact: { prenom: string | null; formeAdresse: "vous" | "tu" };
  prestations: Prestation[];
  lienSite: string | null;
  conseiller: string;
}) {
  const complet = composerMessage({
    prenom: opts.contact.prenom,
    formeAdresse: opts.contact.formeAdresse,
    bien: opts.bien,
    pointsForts: [JETON],
    lienSite: opts.lienSite,
    conseiller: opts.conseiller,
  });
  const [avant, apres] = complet.split(`\n• ${JETON}\n`);
  return {
    libelle: libelleCourt(opts.bien),
    offMarket: estOffMarket(opts.bien),
    pointsFortsInitiaux: pointsFortsParDefaut(opts.prestations),
    construireMessage: { avant, apres },
  };
}

// ---------------------------------------------------------------------------
// Fiche PDF d'une page
// ---------------------------------------------------------------------------

export type PhotoEmbarquee = { dataUri: string; alt: string };

export function rendreFicheClientHtml(opts: {
  bien: Bien;
  photos: PhotoEmbarquee[];
  prestations: Prestation[];
  conseiller: string;
  whatsappAgence: string | null;
}): string {
  const { bien, photos, prestations, conseiller, whatsappAgence } = opts;
  const offMarket = estOffMarket(bien);
  const [principale, ...autres] = photos;
  const vignettes = autres.slice(0, 3);

  const carac: [string, string][] = [];
  const m2 = (n: number | null) => (n ? `${nombre(n)} m²` : null);
  const ajout = (label: string, v: string | null) => {
    if (v) carac.push([label, v]);
  };
  switch (bien.typeBien) {
    case "riad":
      ajout("Surface au sol", m2(bien.surfaceSol));
      break;
    case "villa":
      ajout("Surface habitable", m2(bien.surfaceHabitable));
      ajout("Surface au sol", m2(bien.surfaceSol));
      ajout("Terrain", m2(bien.surfaceTerrain));
      break;
    case "appartement":
      ajout("Surface habitable", m2(bien.surfaceHabitable));
      break;
    case "terrain":
      ajout("Surface du terrain", m2(bien.surfaceTerrain));
      break;
    case "fonds_commerce":
      ajout("Surface au sol", m2(bien.surfaceSol));
      break;
  }
  if (bien.typeBien !== "terrain" && bien.typeBien !== "fonds_commerce") {
    ajout("Chambres", bien.chambres ? String(bien.chambres) : null);
    ajout("Salles de bain", bien.sallesBain ? String(bien.sallesBain) : null);
  }
  ajout("Quartier", bien.quartierNom ?? null);
  ajout("Situation", bien.situation);
  ajout("Statut juridique", bien.statutJuridique ? STATUT_JURIDIQUE_LABELS[bien.statutJuridique] ?? bien.statutJuridique : null);

  const titre = TYPE_BIEN_LABELS[bien.typeBien] ?? bien.typeBien;

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8" />
<title>${esc(bien.reference)}</title>
<style>
  @page { size: A4; margin: 14mm 14mm; }
  * { box-sizing: border-box; }
  body { font-family: Georgia, "Times New Roman", serif; color: #1f1d1a; font-size: 10.5pt; line-height: 1.45; margin: 0; }
  .entete { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid #b9b2a6; padding-bottom: 6px; margin-bottom: 10px; }
  .agence { font-size: 11pt; letter-spacing: 0.1em; font-weight: bold; }
  .ref { font-size: 9.5pt; color: #6b655c; }
  h1 { font-size: 17pt; margin: 0 0 2px; font-weight: normal; }
  .libelle { font-size: 10.5pt; color: #6b655c; margin-bottom: 8px; }
  .prix { font-size: 15pt; font-weight: bold; margin: 6px 0 10px; }
  .discret { display: inline-block; font-size: 9.5pt; font-style: italic; border: 1px solid #b9b2a6; padding: 3px 8px; margin-bottom: 8px; }
  .photo-principale { width: 100%; height: 88mm; object-fit: cover; display: block; background: #eee9e1; }
  .vignettes { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-top: 3mm; }
  .vignettes img { width: 100%; height: 30mm; object-fit: cover; display: block; }
  .sans-photo { height: 60mm; display: flex; align-items: center; justify-content: center; color: #8a8378; background: #eee9e1; font-style: italic; }
  .colonnes { display: grid; grid-template-columns: 1fr 1fr; gap: 0 10mm; margin-top: 6mm; }
  h2 { font-size: 10pt; letter-spacing: 0.08em; text-transform: uppercase; color: #6b655c; font-weight: normal; margin: 0 0 4px; border-bottom: 1px solid #ddd6cb; padding-bottom: 2px; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 3px 0; vertical-align: top; }
  td.l { color: #6b655c; width: 42%; }
  ul { margin: 0; padding-left: 14px; columns: 2; column-gap: 6mm; }
  li { margin: 1px 0; }
  .pied { margin-top: 7mm; border-top: 1px solid #b9b2a6; padding-top: 5px; font-size: 9.5pt; display: flex; justify-content: space-between; }
  .mention { font-size: 8pt; color: #8a8378; margin-top: 3px; }
</style></head>
<body>
  <div class="entete">
    <div class="agence">L'ADRESSE MARRAKCHIE</div>
    <div class="ref">Réf. ${esc(bien.reference)}</div>
  </div>
  <h1>${esc(bien.titre)}</h1>
  <div class="libelle">${esc(libelleCourt(bien))}</div>
  ${offMarket ? `<div class="discret">${esc(MENTION_OFF_MARKET)}</div>` : ""}
  ${principale
    ? `<img class="photo-principale" src="${principale.dataUri}" alt="${esc(principale.alt)}" />`
    : `<div class="sans-photo">Photos sur demande</div>`}
  ${vignettes.length > 0
    ? `<div class="vignettes">${vignettes.map((p) => `<img src="${p.dataUri}" alt="${esc(p.alt)}" />`).join("")}</div>`
    : ""}
  <div class="prix">${esc(prixTexte(bien))}</div>
  <div class="colonnes">
    <div>
      <h2>${esc(titre)}</h2>
      <table>${carac.map(([l, v]) => `<tr><td class="l">${esc(l)}</td><td>${esc(v)}</td></tr>`).join("")}</table>
    </div>
    <div>
      <h2>Prestations</h2>
      ${prestations.length > 0
        ? `<ul>${prestations.map((p) => `<li>${esc(p.nom)}</li>`).join("")}</ul>`
        : `<div class="mention">—</div>`}
    </div>
  </div>
  <div class="pied">
    <div>Votre conseiller : <strong>${esc(conseiller)}</strong></div>
    <div>${whatsappAgence ? `WhatsApp : <strong>${esc(whatsappAgence)}</strong>` : ""}</div>
  </div>
</body></html>`;
}
