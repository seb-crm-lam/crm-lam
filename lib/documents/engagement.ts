import type { Bien, Contact } from "@/lib/types";
import { TYPE_BIEN_LABELS } from "@/lib/format";
import { champ, case_, documentHtml, esc } from "./shared";

// Rendu fidèle à l'engagement de confidentialité — cession de fonds de
// commerce — V2 du 24/09/2026, validé par Seb
// (claude/RECU_Engagement_confidentialite_FC_LAM_V2.md). Pré-remplissage selon
// les conventions du bon de visite ; tout le reste reste en blanc, rien n'est
// déduit. Taux de l'article 5 : repris du mandat du bien, modifiable avant
// génération (décision 2A du 25 septembre).
export function rendreEngagementHtml(opts: {
  bien: Bien;
  candidat: Contact;
  taux: number | null;
  referenceCrm: string;
  agent: string;
  date: Date;
}): string {
  const { bien, candidat, taux, referenceCrm, agent, date } = opts;
  const nomCandidat = `${candidat.prenom ?? ""} ${candidat.nom}`.trim();
  const coordonnees = [candidat.adressePostale, candidat.telephone, candidat.email].filter(Boolean).join(" · ");
  const libelleBien = [TYPE_BIEN_LABELS[bien.typeBien] ?? bien.typeBien, bien.quartierNom, bien.reference]
    .filter(Boolean)
    .join(" — ");
  const d = date;
  const jj = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const aaaa = String(d.getFullYear());

  // Le modèle V2 tient sur une page : mise en page resserrée pour ce document.
  const corps = `
  <style>
    @page { size: A4; margin: 13mm 15mm; }
    body { font-size: 9pt; line-height: 1.32; }
    .entete { margin-bottom: 8px; }
    h2 { margin: 9px 0 3px; }
    p, ul { margin: 3px 0; }
    .signatures { margin-top: 10px; }
    .signatures .ligne { height: 30px; }
    .note-crm { margin-top: 10px; padding: 6px; }
  </style>
  <h2>1 · Parties</h2>
  <div class="deux-colonnes">
    <div>
      <strong>LE CANDIDAT ACQUÉREUR</strong><br/>
      Nom et prénom ou dénomination :<br/>${champ(nomCandidat || null, 260)}<br/>
      CIN / Passeport ou RC :<br/>${champ(candidat.cinPasseport, 260)}<br/>
      Adresse, téléphone, e-mail :<br/>${champ(coordonnees || null, 260)}
    </div>
    <div>
      <strong>L'AGENCE</strong><br/>
      L'ADRESSE MARRAKCHIE, SARL à associé unique<br/>
      RC Marrakech 186055 — ICE 004010136000056<br/>
      IF : ${champ(null, 140)}<br/>
      Siège : Imm. Espace Nakhil, av. Yacoub El Mansour, 5ᵉ ét., bur. 23, Marrakech<br/>
      Représentée par : ${champ(agent || null, 200)}
    </div>
  </div>
  <p>Le candidat agit :
    ${case_(!candidat.agitPourLeCompteDe, "pour son propre compte")}
    ${case_(!!candidat.agitPourLeCompteDe, "pour la société")} ${champ(candidat.agitPourLeCompteDe, 220)}, dont il a les pouvoirs.
  </p>
  <p>L'agence est mandatée par le propriétaire de l'affaire (« le cédant »), dont l'identité peut n'être révélée qu'ultérieurement. Le présent engagement bénéficie à l'agence et au cédant.</p>

  <h2>2 · Affaire concernée</h2>
  <p><strong>Bien :</strong> ${champ(libelleBien, 300)} (nature — quartier — référence)
    ${case_(bien.natureVente === "fonds", "fonds seul")} ${case_(bien.natureVente === "murs_et_fonds", "murs et fonds")}
  </p>

  <h2>3 · Informations confidentielles</h2>
  <p>Sont confidentielles toutes les informations reçues sur l'affaire, sous quelque forme que ce soit : comptes, chiffre d'affaires, taux d'occupation, réservations, contrats, identité du cédant, du personnel, du bailleur, des fournisseurs et des clients, adresse exacte, et la mise en vente elle-même. Ne le sont pas celles déjà publiques, celles que le candidat détenait auparavant et peut le prouver, et celles dont la loi exige la communication.</p>

  <h2>4 · Engagements du candidat — douze mois</h2>
  <p>Pendant douze mois à compter de la signature, que la négociation aboutisse ou non, le candidat s'engage à :</p>
  <ul>
    <li><strong>ne rien divulguer,</strong> sauf à ses conseils (avocat, comptable, banque, notaire) tenus au secret, dont il répond ;</li>
    <li><strong>n'utiliser ces informations</strong> que pour étudier l'acquisition de l'affaire ;</li>
    <li><strong>ne pas approcher,</strong> directement ou par personne interposée, le cédant, le personnel, le bailleur, les fournisseurs, les partenaires ou les clients sans l'accord écrit de l'agence.</li>
  </ul>

  <h2>5 · Non-contournement</h2>
  <p>Si, dans ce même délai, le candidat, un proche, un associé ou une entité qu'il contrôle acquiert tout ou partie de l'affaire — fonds, murs ou parts de la société qui l'exploite — sans l'intervention de l'agence, il doit à l'agence une indemnité égale aux honoraires prévus au mandat, soit ${champ(
    taux !== null ? `${taux.toLocaleString("fr-FR")}` : null,
    60
  )} % HT du prix de l'opération, payable à la signature de l'acte.</p>

  <h2>6 · Dispositions générales</h2>
  <p>Ce document n'est ni une offre ni une promesse. Aucune somme n'est versée à l'agence : les fonds d'une éventuelle cession sont remis au professionnel habilité chargé de l'acte. Il est soumis au droit marocain ; à défaut d'accord amiable, le litige relève de la juridiction compétente.</p>
  <p>Les données du candidat servent à suivre l'affaire et à respecter les obligations légales ; elles peuvent être communiquées au cédant, au notaire et aux autorités habilitées, et sont conservées selon la politique de confidentialité de l'agence. Droits d'accès, de rectification et d'opposition : contact@ladressemarrakchie.com. Référence CNDP : ${champ(null, 160)}.</p>

  <h2>7 · Signature</h2>
  <p>Fait à ${champ(null, 200)}, le ${esc(`${jj} / ${mm} / ${aaaa}`)}, en deux exemplaires, dont un remis au candidat.</p>
  <div class="deux-colonnes signatures">
    <div>
      <strong>LE CANDIDAT</strong><br/>
      Mention manuscrite « Lu et approuvé »<br/>
      <div class="ligne"></div>
      Signature :
    </div>
    <div>
      <strong>RÉSERVÉ À L'AGENCE</strong><br/>
      Agent : ${champ(agent || null, 160)}<br/>
      Pièce d'identité vue : ${case_(false, "oui")}<br/>
      Référence CRM : ${champ(referenceCrm, 140)}<br/>
      Date de remise des informations : ___ / ___ / ______
    </div>
  </div>

  <div class="note-crm">
    Engagement de confidentialité — cession de fonds de commerce — V2 du 24/09/2026. Document généré depuis le CRM LAM le ${esc(
      d.toLocaleDateString("fr-FR")
    )}.
  </div>
  `;

  return documentHtml(
    "ENGAGEMENT DE CONFIDENTIALITÉ",
    "Cession de fonds de commerce — à signer avant toute remise d'informations sur l'exploitation",
    corps
  );
}
