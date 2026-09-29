// Décalage volontaire des coordonnées publiées — décision du 26 septembre 2026
// (claude/CRM_LAM_decisions_26_septembre.md, point 9), modifiée le 29 septembre
// 2026 : 100 à 300 m (et non plus 0 à 300 m), tirage uniforme dans la
// COURONNE entre ces deux rayons. Motif : LAM-0001 avait tiré 19 m, le cercle
// publié était presque centré sur le riad. Tiré UNE SEULE FOIS
// par bien et conservé. Un nouveau tirage n'a lieu que si les coordonnées
// exactes changent (adresse corrigée, bien déplacé).

export const RAYON_MIN_M = 100;
const RAYON_MAX_M = 300;
const METRES_PAR_DEGRE_LAT = 111320;

export interface Coordonnees {
  latitude: number;
  longitude: number;
}

// Tirage uniforme dans une couronne : r = √(Rmin² + u·(Rmax² − Rmin²)) (pas
// r linéaire, qui concentrerait les points vers l'intérieur) ; θ uniforme
// sur [0, 2π).
export function tirerDecalage(exact: Coordonnees): Coordonnees {
  const u = Math.random();
  const theta = Math.random() * 2 * Math.PI;
  const rayon = Math.sqrt(RAYON_MIN_M ** 2 + u * (RAYON_MAX_M ** 2 - RAYON_MIN_M ** 2));
  const dx = rayon * Math.cos(theta); // mètres, vers l'est
  const dy = rayon * Math.sin(theta); // mètres, vers le nord

  const deltaLat = dy / METRES_PAR_DEGRE_LAT;
  const metresParDegreLng = METRES_PAR_DEGRE_LAT * Math.cos((exact.latitude * Math.PI) / 180);
  const deltaLng = metresParDegreLng !== 0 ? dx / metresParDegreLng : 0;

  return {
    latitude: exact.latitude + deltaLat,
    longitude: exact.longitude + deltaLng,
  };
}

// Distance approximative en mètres entre deux points proches (même
// approximation plane que le tirage — suffisante à cette échelle).
export function distanceMetres(a: Coordonnees, b: Coordonnees): number {
  const dy = (b.latitude - a.latitude) * METRES_PAR_DEGRE_LAT;
  const dx = (b.longitude - a.longitude) * METRES_PAR_DEGRE_LAT * Math.cos((a.latitude * Math.PI) / 180);
  return Math.hypot(dx, dy);
}
