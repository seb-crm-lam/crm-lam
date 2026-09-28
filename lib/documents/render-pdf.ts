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
