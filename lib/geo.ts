// Décalage volontaire des coordonnées publiées — décision du 26 septembre 2026
// (claude/CRM_LAM_decisions_26_septembre.md, point 9) : 0 à 300 m, tirage
// uniforme DANS LE DISQUE (pas seulement sur le rayon), tiré UNE SEULE FOIS
// par bien et conservé. Un nouveau tirage n'a lieu que si les coordonnées
// exactes changent (adresse corrigée, bien déplacé).

const RAYON_MAX_M = 300;
const METRES_PAR_DEGRE_LAT = 111320;

export interface Coordonnees {
  latitude: number;
  longitude: number;
}

// Tirage uniforme dans un disque : r = R·√u (pas r = R·u, qui concentrerait
// les points près du centre) ; θ uniforme sur [0, 2π).
export function tirerDecalage(exact: Coordonnees): Coordonnees {
  const u = Math.random();
  const theta = Math.random() * 2 * Math.PI;
  const rayon = RAYON_MAX_M * Math.sqrt(u);
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
