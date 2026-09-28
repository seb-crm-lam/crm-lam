import type { Bien, Contact, Visite } from "@/lib/types";
import { formatDate, VERDICT_VISITE_LABELS, MOTIF_VISITE_LABELS, SUITE_VISITE_LABELS } from "@/lib/format";
import { champ, documentHtml, esc } from "./shared";

type VisiteAvecDate = Visite & { dateLigne: string };

// Compte rendu au vendeur — obligation de l'article 6 du mandat V3.1
// (« rendre compte des démarches »). Récapitule TOUTES les visites du bien,
// dates et retours résumés, sans jamais nommer l'acquéreur (A31). Document
// commercial, pas contractuel : contrairement au mandat, il reste modifiable
// avant envoi (voir le message WhatsApp généré séparément pour la dernière
// visite seule).
export function rendreCompteRenduHtml(bien: Bien, proprietaire: Contact | undefined, visites: VisiteAvecDate[]): string {
  const nomProprietaire = proprietaire
    ? `${proprietaire.prenom ?? ""} ${proprietaire.nom}`.trim()
    : "";

  const lignes = visites.map((v) => {
    const motifs = v.motifs && v.motifs.length > 0
      ? v.motifs.map((m) => MOTIF_VISITE_LABELS[m] ?? m).join(", ")
      : "—";
    return `<tr>
      <td>${esc(formatDate(v.dateVisite))}</td>
      <td>${v.verdict ? esc(VERDICT_VISITE_LABELS[v.verdict] ?? v.verdict) : "—"}</td>
      <td>${esc(motifs)}</td>
      <td>${v.noteLibre ? esc(v.noteLibre) : "—"}</td>
      <td>${v.suite ? esc(SUITE_VISITE_LABELS[v.suite] ?? v.suite) : "—"}</td>
    </tr>`;
  });

  const corps = `
  <p>Bien : ${champ(`${bien.reference} — ${bien.titre}`, 400)}</p>
  <p>Propriétaire : ${champ(nomProprietaire || null, 300)}</p>
  <p>Date d'édition : ${champ(formatDate(new Date().toISOString()), 150)}</p>

  <h2>Visites effectuées (${visites.length})</h2>
  ${visites.length === 0
    ? "<p>Aucune visite enregistrée pour l'instant.</p>"
    : `<table class="grille">
      <tr><th>Date</th><th>Retour</th><th>Points évoqués</th><th>Note</th><th>Suite</th></tr>
      ${lignes.join("\n")}
    </table>`
  }

  <p style="margin-top:16px;">Les acquéreurs ne sont pas nommés dans ce document, conformément à notre pratique de confidentialité.</p>

  <div class="note-crm">
    Document commercial récapitulatif — L'Adresse Marrakchie, ${esc(new Date().getFullYear())}.
  </div>
  `;

  return documentHtml("COMPTE RENDU DE DÉMARCHES", `Bien ${bien.reference}`, corps);
}
