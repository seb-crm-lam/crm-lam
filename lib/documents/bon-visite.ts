import type { Bien, Contact } from "@/lib/types";
import { TYPE_BIEN_LABELS } from "@/lib/format";
import { champ, case_, documentHtml, esc } from "./shared";

// Rendu fidèle au bon de visite LAM (claude/RECU_Bon_de_visite_LAM.md,
// version de référence remise par Seb le 14/09/2026).
export function rendreBonVisiteHtml(visiteur: Contact, biens: Bien[]): string {
  const nomVisiteur = `${visiteur.prenom ?? ""} ${visiteur.nom}`.trim();

  const lignesBiens = Array.from({ length: 4 }).map((_, i) => {
    const b = biens[i];
    const description = b
      ? `${TYPE_BIEN_LABELS[b.typeBien] ?? b.typeBien}, ${b.quartierNom ?? "—"}, ${b.reference}`
      : "";
    return `<tr>
      <td>${i + 1}</td>
      <td>${esc(description)}</td>
      <td></td>
      <td></td>
    </tr>`;
  });

  const corps = `
  <h2>1 · Le visiteur</h2>
  <table class="grille">
    <tr><td>Nom et prénom</td><td>${champ(nomVisiteur || null, 250)}</td><td>CIN / Passeport n°</td><td>${champ(visiteur.cinPasseport, 180)}</td></tr>
    <tr><td>Téléphone</td><td>${champ(visiteur.telephone, 250)}</td><td>Email</td><td>${champ(visiteur.email, 180)}</td></tr>
    <tr><td>Adresse</td><td colspan="3">${champ(visiteur.adressePostale, 500)}</td></tr>
    <tr><td>Agit</td><td colspan="3">
      ${case_(!visiteur.agitPourLeCompteDe, "pour son propre compte")}
      ${case_(!!visiteur.agitPourLeCompteDe, "pour le compte de")} ${champ(visiteur.agitPourLeCompteDe, 250)}
    </td></tr>
  </table>

  <h2>2 · Biens présentés</h2>
  <p>Le visiteur paraphe chaque ligne le jour de la visite du bien concerné.</p>
  <table class="grille">
    <tr><th>N°</th><th>Bien présenté — nature, quartier, référence</th><th>Date</th><th>Paraphe</th></tr>
    ${lignesBiens.join("\n")}
  </table>

  <h2>3 · Ce que le visiteur reconnaît et s'engage à respecter</h2>
  <p>Ces biens lui sont présentés par l'agence. Il déclare ne pas en avoir eu connaissance auparavant par un autre canal, sauf mention portée ici : ${champ(null, 300)}</p>
  <p>Il s'interdit, pendant douze mois à compter de chaque visite, de traiter directement avec le propriétaire ou de passer par un autre intermédiaire pour acquérir le bien visité — y compris par l'intermédiaire d'un proche, d'un associé ou d'une entité qu'il contrôle.</p>
  <p>Si une vente est malgré tout conclue dans ces conditions, l'agence conserve le droit aux honoraires convenus au mandat, quelle que soit la partie qui en supporte la charge.</p>
  <p>Il ne communique à aucun tiers l'adresse des biens visités ni les informations reçues sur les propriétaires.</p>

  <h2>4 · Honoraires</h2>
  <p>Honoraires à la charge de l'acquéreur : ${champ(null, 60)} % HT du prix de vente. Ils ne sont dus qu'en cas de vente définitivement conclue et sont payables à la signature de l'acte définitif, contre facture. Aucune somme n'est due au titre de la seule visite.</p>

  <h2>5 · Identité et données personnelles</h2>
  <p>L'agence vérifie l'identité des visiteurs au titre de ses obligations légales de vigilance et en conserve la trace. Le visiteur peut exercer ses droits d'accès, de rectification et d'opposition auprès de l'agence : ${champ(null, 300)}</p>

  <h2>6 · Signatures</h2>
  <p>Fait à ${champ(null, 200)}, le ${champ(null, 120)}, en deux exemplaires, un remis au visiteur.</p>
  <div class="deux-colonnes signatures">
    <div>
      <strong>LE VISITEUR</strong><br/>
      <div class="ligne"></div>
      Mention « Lu et approuvé » — Signature
    </div>
    <div>
      <strong>L'AGENCE</strong><br/>
      <div class="ligne"></div>
      Nom de l'agent et cachet — Signature
    </div>
  </div>

  <div class="note-crm">
    Réservé à l'agence — à reporter dans le CRM le jour même : Agent ${champ(null, 150)} ·
    Référence CRM ${champ(null, 150)} · Saisi le ${champ(null, 120)} ·
    Pièce d'identité vue ${case_(false, "oui")} ${case_(false, "non")}
  </div>
  `;

  return documentHtml("BON DE VISITE", "Reconnaissance de présentation — à signer avant la première visite", corps);
}
