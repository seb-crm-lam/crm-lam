import type { Bien, Contact } from "@/lib/types";
import { TYPE_BIEN_LABELS } from "@/lib/format";
import { champ, case_, documentHtml, esc } from "./shared";

// Rendu fidèle au mandat de vente LAM V3.1 (claude/RECU_Mandat_de_vente_LAM_V3-1.md,
// version de référence remise par Seb le 14/09/2026). Seuls les champs
// réellement stockés dans le CRM sont pré-remplis ; le reste reste en blanc
// pour complétion manuelle — rien n'est déduit ou inventé.
export function rendreMandatHtml(bien: Bien, proprietaire: Contact | undefined): string {
  const nomProprietaire = proprietaire
    ? `${proprietaire.prenom ?? ""} ${proprietaire.nom}`.trim()
    : "";
  const superficie = [
    bien.surfaceSol ? `${bien.surfaceSol} m² (sol)` : null,
    bien.surfaceHabitable ? `${bien.surfaceHabitable} m² (habitable)` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const corps = `
  <h2>1 · Parties</h2>
  <p>Qualité du mandant :
    ${case_(bien.qualiteMandant === "proprietaire", "propriétaire")} ${case_(bien.qualiteMandant === "co_indivisaire", "co-indivisaire")}
    ${case_(bien.qualiteMandant === "representant_societe", "représentant d'une société")} ${case_(bien.qualiteMandant === "mandataire_habilite", "mandataire habilité")}
  </p>
  <p>Le signataire déclare avoir la capacité et les pouvoirs nécessaires. En indivision, tous les propriétaires signent ou sont valablement représentés.</p>

  <h2>2 · Bien confié à la vente</h2>
  <p>Nature et adresse : ${champ(
    [TYPE_BIEN_LABELS[bien.typeBien] ?? bien.typeBien, bien.adresseExacte || bien.situation, bien.quartierNom]
      .filter(Boolean)
      .join(" — "),
    400
  )}</p>
  <p>Superficie et description : ${champ(superficie || null, 400)}</p>
  <p>Situation foncière :
    ${case_(bien.statutJuridique === "titre_foncier", "titre foncier n°")} ${champ(
    bien.statutJuridique === "titre_foncier" ? bien.numeroTitre : null
  )}
    ${case_(false, "en réquisition n°")} ${champ(null)}
    ${case_(bien.statutJuridique === "melkia", "melkia")}
  </p>
  <p>Occupation et charges : ${case_(false, "libre")} ${case_(false, "occupé")}
    ${case_(false, "hypothèque ou charge à préciser")} : ${champ(null, 300)}
  </p>
  <p>Le mandant certifie l'exactitude de ces informations et remet les justificatifs utiles avant diffusion.</p>

  <h2>3 · Mission et limites</h2>
  <p>Le mandant charge l'agence de rechercher un acquéreur, présenter le bien, organiser les visites, recueillir et transmettre les offres, puis mettre les parties en relation avec le notaire ou l'adoul choisi.</p>
  <p>L'agence ne peut ni accepter une offre, ni signer une promesse ou un acte, ni réduire le prix sans accord écrit du mandant. Elle ne reçoit aucun acompte, arrhes, dépôt ou séquestre.</p>

  <h2>4 · Type et durée du mandat</h2>
  <p>Type :
    ${case_(!bien.exclusivite, "simple")}
    ${case_(bien.exclusivite, "exclusif")}
    ${case_(false, "semi-exclusif")}
  </p>
  <p>Durée : ${champ(null, 60)} mois à compter du ${champ(null, 100)}.
    ${case_(false, "sans reconduction")} ${case_(false, "reconduction par périodes de")} ${champ(null, 60)} mois.
  </p>

  <h2>5 · Prix et honoraires</h2>
  <p>Prix net vendeur : ${champ(bien.prixPlancher ? `${bien.prixPlancher.toLocaleString("fr-FR")} DH` : null)}
     Prix affiché : ${champ(
       bien.prixSurDemande ? "sur demande" : bien.prixVente ? `${bien.prixVente.toLocaleString("fr-FR")} DH` : null
     )}
  </p>
  <p>Honoraires : ${champ(bien.honorairesPourcentage ? `${bien.honorairesPourcentage} %` : null, 60)} HT du prix définitif,
     minimum éventuel de ${champ(bien.honorairesMinimumDh ? `${bien.honorairesMinimumDh.toLocaleString("fr-FR")} DH` : null)} HT.
  </p>
  <p>À la charge de : ${champ(bien.honorairesCharge, 300)}</p>
  <p>Les honoraires ne sont dus qu'en cas de vente définitivement conclue grâce à l'intervention ou aux indications de l'agence, et sont payables à la signature de l'acte définitif, contre facture.</p>
  <p>L'agence n'exerce aucune mission de conseil fiscal : le calcul des impôts, taxes et droits liés à la vente, les exonérations éventuelles et les déclarations relèvent du notaire, de l'adoul ou du conseil du mandant.</p>

  <h2>6 · Obligations de l'agence</h2>
  <p>Présenter l'affaire avec exactitude, précision et bonne foi, organiser les visites et rendre compte des démarches. Vérifier l'identité des clients, protéger les informations reçues.</p>

  <h2>7 · Obligations du mandant</h2>
  <p>Fournir des informations sincères sur la propriété, les charges, les litiges, les travaux, l'occupation et la situation fiscale ou administrative du bien. Remettre les documents demandés, permettre les visites convenues, respecter l'exclusivité choisie.</p>

  <h2>8 · Diffusion et données personnelles</h2>
  <p>Le mandant autorise l'agence à photographier le bien et à diffuser sa description, son prix et les supports utiles sur ses canaux et ceux de ses partenaires.
     Localisation publiée : ${case_(false, "quartier")} ${case_(false, "secteur large")}
  </p>
  <p>Le mandant peut exercer ses droits d'accès, de rectification et d'opposition auprès de l'agence : ${champ(null, 300)}</p>

  <h2>9 · Non-contournement</h2>
  <p>Si une vente est définitivement conclue, pendant le mandat ou dans les douze mois suivant sa fin, avec un acquéreur présenté par l'agence et identifié par un bon de visite ou un échange écrit, les honoraires convenus restent dus.</p>

  <h2>10 · Droit applicable et différends</h2>
  <p>Le mandat est soumis au droit marocain. Les parties recherchent d'abord une solution amiable ; à défaut, le litige relève de la juridiction territorialement compétente selon la loi.</p>

  <h2>11 · Pièces à remettre</h2>
  <table class="grille">
    <tr>
      <th>Identité et pouvoirs</th>
      <th>Bien</th>
    </tr>
    <tr>
      <td>
        ${case_(false, "CIN ou passeport")}<br/>
        ${case_(false, "Statuts, RC et pouvoirs du représentant")}<br/>
        ${case_(false, "Accord des co-indivisaires ou procuration authentique (notaire ou adouls)")}<br/>
        ${case_(false, "Identification du bénéficiaire effectif si requise")}
      </td>
      <td>
        ${case_(false, "Titre et certificat de propriété récent")}<br/>
        ${case_(false, "Plans et autorisations disponibles")}<br/>
        ${case_(false, "Bail, charges, hypothèques et litiges")}<br/>
        ${case_(false, "Quitus de copropriété, le cas échéant")}
      </td>
    </tr>
  </table>

  <h2>12 · Signatures</h2>
  <p>Fait à ${champ(null, 200)}, le ${champ(null, 120)}, en deux originaux.</p>
  <div class="deux-colonnes signatures">
    <div>
      <strong>LE MANDANT</strong><br/>
      Nom : ${champ(nomProprietaire || null, 260)}<br/>
      CIN / Passeport : ${champ(proprietaire?.cinPasseport, 200)}<br/>
      Adresse : ${champ(proprietaire?.adressePostale, 260)}<br/>
      Téléphone / Email : ${champ(
        [proprietaire?.telephone, proprietaire?.email].filter(Boolean).join(" / ") || null,
        260
      )}<br/>
      <div class="ligne"></div>
      Mention « Lu et approuvé, bon pour mandat » — Signature
    </div>
    <div>
      <strong>L'AGENCE MANDATAIRE</strong><br/>
      Dénomination : L'Adresse Marrakchie<br/>
      RC / IF / ICE : ${champ(null, 200)}<br/>
      Représentée par : ${champ(bien.conseillerReferent, 260)}<br/>
      <div class="ligne"></div>
      Nom, qualité et cachet — Signature
    </div>
  </div>

  <div class="note-crm">
    Document généré depuis le CRM LAM le ${esc(new Date().toLocaleDateString("fr-FR"))} — Réf. bien : ${esc(
    bien.reference
  )}. Les champs non renseignés dans le CRM restent à compléter manuellement avant signature.
  </div>
  `;

  return documentHtml(
    "MANDAT DE VENTE IMMOBILIÈRE",
    "Mandat de commercialisation sans pouvoir de signer ni d'encaisser — V3.1",
    corps
  );
}
