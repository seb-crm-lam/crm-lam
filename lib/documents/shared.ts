// Rendu HTML commun aux documents imprimables (mandat, bon de visite).
// Ces pages sont converties en PDF via Chromium headless (Playwright) —
// voir app/api/documents/*.

export function esc(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Champ à remplir : affiche la valeur connue si elle existe, sinon un blanc
// souligné — jamais de valeur inventée.
export function champ(valeur: unknown, largeur = 220): string {
  if (valeur === null || valeur === undefined || valeur === "") {
    return `<span class="blanc" style="min-width:${largeur}px"></span>`;
  }
  return `<span class="rempli">${esc(valeur)}</span>`;
}

export function case_(coche: boolean | null, label: string): string {
  return `<span class="case">${coche ? "☑" : "☐"} ${esc(label)}</span>`;
}

export function documentHtml(titre: string, sousTitre: string, corps: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charSet="utf-8" />
<title>${esc(titre)}</title>
<style>
  @page { size: A4; margin: 20mm 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: Georgia, "Times New Roman", serif;
    font-size: 10.5pt;
    line-height: 1.5;
    color: #1a1a1a;
  }
  .entete { text-align: center; margin-bottom: 18px; }
  .entete .agence { font-size: 13pt; letter-spacing: 0.08em; font-weight: bold; }
  .entete .titre { font-size: 15pt; font-weight: bold; margin-top: 10px; }
  .entete .sous-titre { font-size: 10pt; font-style: italic; color: #444; margin-top: 4px; }
  h2 {
    font-size: 11pt;
    margin: 18px 0 6px;
    padding-bottom: 2px;
    border-bottom: 1px solid #999;
  }
  p { margin: 6px 0; }
  .blanc {
    display: inline-block;
    border-bottom: 1px solid #333;
    min-height: 1em;
  }
  .rempli { font-weight: bold; }
  .case { margin-right: 14px; white-space: nowrap; }
  table.grille { width: 100%; border-collapse: collapse; margin: 8px 0; }
  table.grille td, table.grille th {
    border: 1px solid #999;
    padding: 5px 8px;
    font-size: 9.5pt;
    vertical-align: top;
  }
  .deux-colonnes { display: grid; grid-template-columns: 1fr 1fr; gap: 0 24px; }
  .signatures { margin-top: 26px; break-inside: avoid; page-break-inside: avoid; }
  .signatures .ligne { height: 46px; }
  h2, table.grille { break-inside: avoid; page-break-inside: avoid; }
  .note-crm {
    margin-top: 28px;
    padding: 10px;
    border: 1px dashed #999;
    font-size: 9pt;
    color: #555;
  }
</style>
</head>
<body>
  <div class="entete">
    <div class="agence">L'ADRESSE MARRAKCHIE</div>
    <div class="titre">${esc(titre)}</div>
    <div class="sous-titre">${esc(sousTitre)}</div>
  </div>
  ${corps}
</body>
</html>`;
}
