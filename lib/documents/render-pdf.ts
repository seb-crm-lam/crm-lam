import { chromium } from "playwright";
import fs from "node:fs";

// Chemin Chromium pré-installé dans le bac à sable de développement (Claude).
// Sur la machine de Seb, ce chemin n'existera pas : Playwright utilisera
// alors sa résolution normale, à condition d'avoir lancé une fois
// `npx playwright install chromium` après le npm install.
const CHROMIUM_SANDBOX_PATH = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH ||
  (fs.existsSync(CHROMIUM_SANDBOX_PATH) ? CHROMIUM_SANDBOX_PATH : undefined);

export async function htmlVersPdf(html: string): Promise<Buffer> {
  const browser = await chromium.launch({
    executablePath,
    args: ["--no-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({ format: "A4", printBackground: true });
    return pdf;
  } finally {
    await browser.close();
  }
}

// Si la fabrication du PDF échoue (navigateur absent, erreur de rendu…),
// on affiche une page lisible au lieu d'une page blanche.
export function reponseErreurPdf(erreur: unknown): Response {
  const raison = erreur instanceof Error ? erreur.message : String(erreur);
  console.error("[PDF] échec de la génération :", raison);
  const raisonCourte = raison.split("\n")[0].slice(0, 300)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>PDF non créé</title></head>
<body style="font-family:system-ui,sans-serif;max-width:560px;margin:48px auto;padding:0 16px;color:#1a1a1a">
<h1 style="font-size:20px">Le PDF n'a pas pu être créé</h1>
<p>Rien n'a été enregistré. Vous pouvez fermer cet onglet et réessayer.</p>
<p style="font-size:13px;color:#666">Raison technique : ${raisonCourte}</p>
</body></html>`;
  return new Response(html, {
    status: 500,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
