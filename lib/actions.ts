"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "./db";
import { getBien } from "./repo";
import { tirerDecalage, distanceMetres, RAYON_MIN_M } from "./geo";
import { enregistrerPhotoPapier } from "./documents/storage";
import { PIECES_DOSSIER, blocFondsParDefaut } from "./pieces";

// ---------------------------------------------------------------------------
// Biens — champs essentiels (ceux affichés sur la fiche bien). Le schéma
// complet (claude/CRM_LAM_schema_donnees.md) reste la référence ; les
// champs non couverts ici restent modifiables plus tard sans rien casser.
// ---------------------------------------------------------------------------

function prochaineReference(): string {
  const row = db.prepare(`SELECT reference FROM Bien ORDER BY createdAt DESC LIMIT 1`).get() as
    | { reference: string }
    | undefined;
  const dernierNumero = row ? parseInt(row.reference.replace("LAM-", ""), 10) || 0 : 0;
  return `LAM-${String(dernierNumero + 1).padStart(4, "0")}`;
}

function champTexte(formData: FormData, nom: string): string | null {
  const v = formData.get(nom);
  if (v === null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function champNombre(formData: FormData, nom: string): number | null {
  const s = champTexte(formData, nom);
  if (s === null) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function champBool(formData: FormData, nom: string): 0 | 1 {
  return formData.get(nom) ? 1 : 0;
}

// Valeurs fermées — mandat V3.1 art. 1 et A22.
const QUALITES_MANDANT = ["proprietaire", "co_indivisaire", "representant_societe", "mandataire_habilite"];
const NATURES_VENTE = ["murs", "fonds", "murs_et_fonds"];
// Origine du bien — liste fermée. « RDS » retiré le 26 septembre 2026
// (sujet RDS clos, claude/CRM_LAM_decisions_26_septembre.md, point 10-11).
const TYPES_ORIGINE = ["demarchage", "samsar", "recommandation_client", "confrere", "autre"];
// Fonds de commerce — état d'exploitation (A22, 14 septembre).
const ETATS_EXPLOITATION = ["en_activite", "en_cessation"];

function champListe(formData: FormData, nom: string, valeurs: string[]): string | null {
  const v = champTexte(formData, nom);
  return v && valeurs.includes(v) ? v : null;
}

function extraireChampsBien(formData: FormData, creation = false) {
  const typeBien = champTexte(formData, "typeBien") ?? "riad";
  const natureVente = typeBien === "fonds_commerce" ? champListe(formData, "natureVente", NATURES_VENTE) : null;
  // Prix affiché au visiteur du site — décision du 27 septembre 2026 : pour
  // un fonds de commerce, l'écran présente une case « Afficher le prix »
  // (cochée = le prix apparaît, décochée = « sur demande »), inverse de la
  // case générique « Prix sur demande » des autres types. La donnée stockée
  // (prixSurDemande) reste la même pour tous les types.
  const prixSurDemande =
    typeBien === "fonds_commerce"
      ? formData.get("afficherPrix")
        ? 0
        : 1
      : champBool(formData, "prixSurDemande");
  // Case « bloc fonds » (3C) : on n'enregistre un choix explicite que s'il
  // diffère de la valeur par défaut ; sinon NULL, pour que la case suive
  // d'elle-même un changement ultérieur de type ou de nature de la vente.
  const coche = !!formData.get("piecesFonds");
  // À la création, le formulaire ne connaît pas encore la valeur par défaut :
  // une case laissée vide n'est donc pas un refus, on garde la valeur par défaut.
  const parDefaut = blocFondsParDefaut({ typeBien, natureVente });
  const piecesFonds = coche === parDefaut || (creation && !coche) ? null : coche ? 1 : 0;
  return {
    natureVente,
    piecesFonds,
    qualiteMandant: champListe(formData, "qualiteMandant", QUALITES_MANDANT),
    // 29 septembre : « m2 » et non « m² » dans les titres (le « ² » devient
    // %c2%b2 dans l'adresse de la page). Remplacement automatique à la saisie.
    titre: (champTexte(formData, "titre") ?? "").replace(/m²/g, "m2"),
    description: champTexte(formData, "description"),
    typeBien,
    transaction_: champTexte(formData, "transaction") ?? "vente",
    quartierId: champTexte(formData, "quartierId"),
    situation: champTexte(formData, "situation"),
    statutJuridique: champTexte(formData, "statutJuridique"),
    etatBien: champTexte(formData, "etatBien"),
    surfaceSol: champNombre(formData, "surfaceSol"),
    surfaceHabitable: champNombre(formData, "surfaceHabitable"),
    chambres: champNombre(formData, "chambres"),
    sallesBain: champNombre(formData, "sallesBain"),
    prixVente: champNombre(formData, "prixVente"),
    prixSurDemande,
    prixPlancher: champNombre(formData, "prixPlancher"),
    honorairesPourcentage: champNombre(formData, "honorairesPourcentage"),
    mentionEditoriale: champTexte(formData, "mentionEditoriale"),
    conseillerReferent: champTexte(formData, "conseillerReferent"),
    notesInternes: champTexte(formData, "notesInternes"),
    diffusionEtat: champTexte(formData, "diffusionEtat") ?? "brouillon",
    statutCommercial: champTexte(formData, "statutCommercial") ?? "disponible",
    estimationAgence: champNombre(formData, "estimationAgence"),
    contactAcces: champTexte(formData, "contactAcces"),
    clesConfiees: formData.get("clesConfiees") ? 1 : formData.get("clesConfiees") === null ? null : 0,
    commissionTauxOuMontant: champTexte(formData, "commissionTauxOuMontant"),
    proprietaireId: champTexte(formData, "proprietaireId"),
    apporteurId: champTexte(formData, "apporteurId"),
    // 26 septembre — origine du bien : liste fermée, « RDS » retiré (sujet clos).
    typeOrigine: champListe(formData, "typeOrigine", TYPES_ORIGINE),
    exclusivite: champBool(formData, "exclusivite"),
    latitudeExacte: champNombre(formData, "latitudeExacte"),
    longitudeExacte: champNombre(formData, "longitudeExacte"),
    // Bloc fonds de commerce (§11 champs_bien_et_contact.md / §6 cadrage).
    etatExploitation:
      typeBien === "fonds_commerce" ? champListe(formData, "etatExploitation", ETATS_EXPLOITATION) : null,
    activite: typeBien === "fonds_commerce" ? champTexte(formData, "activite") : null,
    capaciteValeur: typeBien === "fonds_commerce" ? champNombre(formData, "capaciteValeur") : null,
    capaciteUnite: typeBien === "fonds_commerce" ? champTexte(formData, "capaciteUnite") : null,
    salaries: typeBien === "fonds_commerce" ? champNombre(formData, "salaries") : null,
    joursOuverture: typeBien === "fonds_commerce" ? champTexte(formData, "joursOuverture") : null,
    horairesOuverture: typeBien === "fonds_commerce" ? champTexte(formData, "horairesOuverture") : null,
    licenceAlcool: typeBien === "fonds_commerce" ? champBool(formData, "licenceAlcool") : null,
    droitTerrasse: typeBien === "fonds_commerce" ? champBool(formData, "droitTerrasse") : null,
    autorisationExploitation:
      typeBien === "fonds_commerce" ? champBool(formData, "autorisationExploitation") : null,
    autorisationExploitationActivite:
      typeBien === "fonds_commerce" ? champTexte(formData, "autorisationExploitationActivite") : null,
    equipement:
      typeBien === "fonds_commerce"
        ? JSON.stringify(formData.getAll("equipement").map(String))
        : null,
    // Fonds de commerce : prix_fonds/prix_murs restent internes, jamais
    // publics (décision confirmée le 26 septembre). Saisis seulement si le
    // bloc fonds est actif (nature_vente = fonds ou murs_et_fonds).
    prixFonds:
      typeBien === "fonds_commerce" && natureVente !== "murs" ? champNombre(formData, "prixFonds") : null,
    prixMurs:
      typeBien === "fonds_commerce" && (natureVente === "murs" || natureVente === "murs_et_fonds")
        ? champNombre(formData, "prixMurs")
        : null,
  };
}

// Champs obligatoires d'un bien — décision du 8 septembre, confirmée le
// 24 septembre : type, quartier, titre. Rien d'autre à la création.
function verifierChampsBien(champs: { titre: string; typeBien: string; quartierId: string | null }) {
  if (!champs.titre) throw new Error("Le titre est obligatoire.");
  if (!champs.typeBien) throw new Error("Le type de bien est obligatoire.");
  if (!champs.quartierId) throw new Error("Le quartier est obligatoire.");
}

// Prestations cochées sur la fiche : on remplace la liste du bien par celle du formulaire.
function enregistrerPrestations(bienId: string, formData: FormData) {
  const ids = formData.getAll("prestations").map(String);
  const valides = new Set(
    (db.prepare(`SELECT id FROM Prestation`).all() as { id: string }[]).map((r) => r.id)
  );
  const ins = db.prepare(`INSERT INTO BienPrestation (bienId, prestationId) VALUES (?, ?)`);
  db.transaction(() => {
    db.prepare(`DELETE FROM BienPrestation WHERE bienId = ?`).run(bienId);
    for (const id of ids) if (valides.has(id)) ins.run(bienId, id);
  })();
}

// Coordonnées publiées — décalage tiré une seule fois par bien (décision du
// 26 septembre), retiré seulement si les coordonnées exactes changent.
function calculerCoordonneesPubliees(
  latitudeExacte: number | null,
  longitudeExacte: number | null,
  avant?: { latitudeExacte: number | null; longitudeExacte: number | null; latitudePubliee: number | null; longitudePubliee: number | null }
): { latitudePubliee: number | null; longitudePubliee: number | null } {
  if (latitudeExacte === null || longitudeExacte === null) {
    return { latitudePubliee: null, longitudePubliee: null };
  }
  const inchangees =
    avant &&
    avant.latitudeExacte === latitudeExacte &&
    avant.longitudeExacte === longitudeExacte &&
    avant.latitudePubliee !== null &&
    avant.longitudePubliee !== null &&
    // 29 septembre : un tirage ancien à moins de 100 m (règle 0-300 m) est
    // refait automatiquement au prochain enregistrement.
    distanceMetres(
      { latitude: latitudeExacte, longitude: longitudeExacte },
      { latitude: avant.latitudePubliee, longitude: avant.longitudePubliee }
    ) >= RAYON_MIN_M;
  if (inchangees) {
    return { latitudePubliee: avant!.latitudePubliee, longitudePubliee: avant!.longitudePubliee };
  }
  const decalees = tirerDecalage({ latitude: latitudeExacte, longitude: longitudeExacte });
  return { latitudePubliee: decalees.latitude, longitudePubliee: decalees.longitude };
}

export async function createBien(formData: FormData) {
  const champs = extraireChampsBien(formData, true);
  verifierChampsBien(champs);
  const id = randomUUID();
  const reference = prochaineReference();

  db.prepare(
    `INSERT INTO Bien (
      id, reference, titre, description, typeBien, transaction_, quartierId, situation,
      statutJuridique, etatBien, surfaceSol, surfaceHabitable, chambres, sallesBain,
      prixVente, prixSurDemande, prixPlancher, honorairesPourcentage,
      mentionEditoriale, conseillerReferent, typeOrigine, notesInternes, exclusivite,
      diffusionEtat, statutCommercial, estimationAgence, contactAcces, clesConfiees,
      commissionTauxOuMontant, proprietaireId, apporteurId, natureVente, piecesFonds, qualiteMandant,
      latitudeExacte, longitudeExacte, latitudePubliee, longitudePubliee,
      etatExploitation, activite, capaciteValeur, capaciteUnite, salaries, joursOuverture,
      horairesOuverture, licenceAlcool, droitTerrasse, autorisationExploitation,
      autorisationExploitationActivite, equipement, prixFonds, prixMurs
    ) VALUES (
      @id, @reference, @titre, @description, @typeBien, @transaction_, @quartierId, @situation,
      @statutJuridique, @etatBien, @surfaceSol, @surfaceHabitable, @chambres, @sallesBain,
      @prixVente, @prixSurDemande, @prixPlancher, @honorairesPourcentage,
      @mentionEditoriale, @conseillerReferent, @typeOrigine, @notesInternes, @exclusivite,
      @diffusionEtat, @statutCommercial, @estimationAgence, @contactAcces, @clesConfiees,
      @commissionTauxOuMontant, @proprietaireId, @apporteurId, @natureVente, @piecesFonds, @qualiteMandant,
      @latitudeExacte, @longitudeExacte, @latitudePubliee, @longitudePubliee,
      @etatExploitation, @activite, @capaciteValeur, @capaciteUnite, @salaries, @joursOuverture,
      @horairesOuverture, @licenceAlcool, @droitTerrasse, @autorisationExploitation,
      @autorisationExploitationActivite, @equipement, @prixFonds, @prixMurs
    )`
  ).run({
    id,
    reference,
    ...champs,
    ...calculerCoordonneesPubliees(champs.latitudeExacte, champs.longitudeExacte),
  });
  enregistrerPrestations(id, formData);

  revalidatePath("/biens");
  redirect(`/biens/${id}`);
}

export async function updateBien(bienId: string, formData: FormData) {
  const champs = extraireChampsBien(formData);
  verifierChampsBien(champs);
  const avant = getBien(bienId);

  db.prepare(
    `UPDATE Bien SET
      titre = @titre, description = @description, typeBien = @typeBien, transaction_ = @transaction_,
      quartierId = @quartierId, situation = @situation,
      statutJuridique = @statutJuridique, etatBien = @etatBien,
      surfaceSol = @surfaceSol, surfaceHabitable = @surfaceHabitable,
      chambres = @chambres, sallesBain = @sallesBain,
      prixVente = @prixVente, prixSurDemande = @prixSurDemande,
      prixPlancher = @prixPlancher, honorairesPourcentage = @honorairesPourcentage,
      mentionEditoriale = @mentionEditoriale, conseillerReferent = @conseillerReferent,
      typeOrigine = @typeOrigine, notesInternes = @notesInternes, exclusivite = @exclusivite,
      diffusionEtat = @diffusionEtat, statutCommercial = @statutCommercial,
      estimationAgence = @estimationAgence, contactAcces = @contactAcces,
      clesConfiees = @clesConfiees, commissionTauxOuMontant = @commissionTauxOuMontant,
      proprietaireId = @proprietaireId, apporteurId = @apporteurId,
      natureVente = @natureVente, piecesFonds = @piecesFonds, qualiteMandant = @qualiteMandant,
      latitudeExacte = @latitudeExacte, longitudeExacte = @longitudeExacte,
      latitudePubliee = @latitudePubliee, longitudePubliee = @longitudePubliee,
      etatExploitation = @etatExploitation, activite = @activite,
      capaciteValeur = @capaciteValeur, capaciteUnite = @capaciteUnite, salaries = @salaries,
      joursOuverture = @joursOuverture, horairesOuverture = @horairesOuverture,
      licenceAlcool = @licenceAlcool, droitTerrasse = @droitTerrasse,
      autorisationExploitation = @autorisationExploitation,
      autorisationExploitationActivite = @autorisationExploitationActivite,
      equipement = @equipement, prixFonds = @prixFonds, prixMurs = @prixMurs,
      updatedAt = datetime('now')
    WHERE id = @id`
  ).run({
    id: bienId,
    ...champs,
    ...calculerCoordonneesPubliees(champs.latitudeExacte, champs.longitudeExacte, avant),
  });
  enregistrerPrestations(bienId, formData);

  revalidatePath(`/biens/${bienId}`);
  redirect(`/biens/${bienId}`);
}

// ---------------------------------------------------------------------------
// Contacts
// ---------------------------------------------------------------------------

function extraireChampsContact(formData: FormData) {
  return {
    nom: champTexte(formData, "nom") ?? "",
    prenom: champTexte(formData, "prenom"),
    telephone: champTexte(formData, "telephone"),
    email: champTexte(formData, "email"),
    cinPasseport: champTexte(formData, "cinPasseport"),
    adressePostale: champTexte(formData, "adressePostale"),
    agitPourLeCompteDe: champTexte(formData, "agitPourLeCompteDe"),
    formeAdresse: champTexte(formData, "formeAdresse") === "tu" ? "tu" : "vous",
    statut: champTexte(formData, "statut") ?? "nouveau",
    consentementProspection: champBool(formData, "consentementProspection"),
    dateConsentement: champTexte(formData, "dateConsentement"),
    origineConsentement: champTexte(formData, "origineConsentement"),
    texteConsentement: champTexte(formData, "texteConsentement"),
    accordReponse: champBool(formData, "accordReponse"),
    dateAccordReponse: champTexte(formData, "dateAccordReponse"),
    texteAccordReponse: champTexte(formData, "texteAccordReponse"),
  };
}

// Champs obligatoires d'un contact — décision du 24 septembre : nom + téléphone.
function verifierChampsContact(champs: { nom: string; telephone: string | null }) {
  if (!champs.nom) throw new Error("Le nom est obligatoire.");
  if (!champs.telephone) throw new Error("Le téléphone est obligatoire.");
}

export async function createContact(formData: FormData) {
  const champs = extraireChampsContact(formData);
  verifierChampsContact(champs);
  const id = randomUUID();

  db.prepare(
    `INSERT INTO Contact (
      id, nom, prenom, telephone, email, cinPasseport, adressePostale,
      agitPourLeCompteDe, formeAdresse, statut, consentementProspection, dateConsentement,
      origineConsentement, texteConsentement, accordReponse, dateAccordReponse, texteAccordReponse,
      dateDernierContact
    ) VALUES (
      @id, @nom, @prenom, @telephone, @email, @cinPasseport, @adressePostale,
      @agitPourLeCompteDe, @formeAdresse, @statut, @consentementProspection, @dateConsentement,
      @origineConsentement, @texteConsentement, @accordReponse, @dateAccordReponse, @texteAccordReponse,
      datetime('now')
    )`
  ).run({ id, ...champs });

  revalidatePath("/contacts");
  redirect(`/contacts/${id}`);
}

export async function updateContact(contactId: string, formData: FormData) {
  const champs = extraireChampsContact(formData);
  verifierChampsContact(champs);

  db.prepare(
    `UPDATE Contact SET
      nom = @nom, prenom = @prenom, telephone = @telephone, email = @email,
      cinPasseport = @cinPasseport, adressePostale = @adressePostale,
      agitPourLeCompteDe = @agitPourLeCompteDe, formeAdresse = @formeAdresse, statut = @statut,
      consentementProspection = @consentementProspection,
      dateConsentement = @dateConsentement, origineConsentement = @origineConsentement,
      texteConsentement = @texteConsentement, accordReponse = @accordReponse,
      dateAccordReponse = @dateAccordReponse, texteAccordReponse = @texteAccordReponse
    WHERE id = @id`
  ).run({ id: contactId, ...champs });

  revalidatePath(`/contacts/${contactId}`);
  redirect(`/contacts/${contactId}`);
}

// ---------------------------------------------------------------------------
// Documents (mandat) — marquage « signé » (A30 : « Au retour : marquer
// signé, avec la date et la photo du papier »).
// ---------------------------------------------------------------------------

export async function marquerDocumentSigne(documentId: string, formData: FormData) {
  const dateSignature = champTexte(formData, "dateSignature");
  const fichier = formData.get("photoPapier") as File | null;
  const doc = db.prepare(`SELECT bienId, contactId, typeDocument FROM Document WHERE id = ?`).get(documentId) as
    | { bienId: string | null; contactId: string | null; typeDocument: string }
    | undefined;
  const typeDocument = doc?.typeDocument ?? "mandat";
  const cheminPhoto = await enregistrerPhotoPapier(`${typeDocument}-signatures`, fichier);

  db.prepare(
    `UPDATE Document SET signe = 1, dateSignature = @dateSignature,
      photoPapier = COALESCE(@photoPapier, photoPapier)
    WHERE id = @id`
  ).run({ id: documentId, dateSignature, photoPapier: cheminPhoto });

  if (doc?.bienId) {
    db.prepare(
      `INSERT INTO Evenement (id, bienId, contactId, typeEvenement, detail) VALUES (@id, @bienId, @contactId, @type, @detail)`
    ).run({
      id: randomUUID(),
      bienId: doc.bienId,
      // l'engagement de confidentialité s'inscrit aussi dans l'historique du candidat
      contactId: typeDocument === "engagement_confidentialite" ? doc.contactId : null,
      type: `${typeDocument}_signe`,
      detail: dateSignature ? `signé le ${dateSignature}` : "signé",
    });
    revalidatePath(`/biens/${doc.bienId}`);
  }
}

// ---------------------------------------------------------------------------
// Dossier de pièces vendeur (A25) — une pièce à la fois, upsert par
// (bienId, pieceKey). La liste des pièces valides vient du catalogue fixe
// (lib/pieces.ts), jamais saisie librement.
// ---------------------------------------------------------------------------

export async function mettreAJourPieceDossier(bienId: string, pieceKey: string, formData: FormData) {
  if (!PIECES_DOSSIER.some((p) => p.key === pieceKey)) {
    throw new Error("Pièce inconnue du catalogue.");
  }
  const recueLe = champTexte(formData, "recueLe");
  const conformeRaw = formData.get("conforme");
  const conforme = conformeRaw === "oui" ? 1 : conformeRaw === "non" ? 0 : null;
  const relanceDemandee = formData.get("relanceDemandee") ? 1 : 0;

  const existant = db
    .prepare(`SELECT id FROM PieceDossier WHERE bienId = ? AND pieceKey = ?`)
    .get(bienId, pieceKey) as { id: string } | undefined;

  if (existant) {
    db.prepare(
      `UPDATE PieceDossier SET recueLe = @recueLe, conforme = @conforme,
        relanceDemandee = @relanceDemandee, updatedAt = datetime('now')
       WHERE id = @id`
    ).run({ id: existant.id, recueLe, conforme, relanceDemandee });
  } else {
    db.prepare(
      `INSERT INTO PieceDossier (id, bienId, pieceKey, recueLe, conforme, relanceDemandee)
       VALUES (@id, @bienId, @pieceKey, @recueLe, @conforme, @relanceDemandee)`
    ).run({ id: randomUUID(), bienId, pieceKey, recueLe, conforme, relanceDemandee });
  }

  revalidatePath(`/biens/${bienId}`);
}

// ---------------------------------------------------------------------------
// Envoi WhatsApp réel (A8) — le lien wa.me est ouvert côté client ; cette
// action enregistre seulement l'événement au clic sur « Confirmer l'envoi ».
// ---------------------------------------------------------------------------

export async function logEnvoiWhatsapp(contactId: string, bienId: string | null, detail: string) {
  const maintenant = new Date().toISOString();
  db.prepare(
    `INSERT INTO Evenement (id, contactId, bienId, typeEvenement, detail)
     VALUES (@id, @contactId, @bienId, 'whatsapp_envoye', @detail)`
  ).run({ id: randomUUID(), contactId, bienId, detail });
  db.prepare(`UPDATE Contact SET dateDernierContact = @date WHERE id = @id`).run({
    id: contactId,
    date: maintenant,
  });
  revalidatePath(`/contacts/${contactId}`);
  if (bienId) revalidatePath(`/biens/${bienId}`);
}

// Correction d'un envoi WhatsApp (A8) : le clic sur « Ouvrir WhatsApp » a
// été tracé, mais le message n'est pas parti. Rien n'est effacé (historique
// append-only) : on ajoute un événement « whatsapp_non_envoye » qui pointe
// vers l'envoi, et la date du dernier contact est recalculée sans lui — un
// message jamais parti ne doit pas repousser l'anonymisation à 5 ans.
// Les dates d'événements existent sous deux formes (« 2026-09-24 08:36:40 »
// écrit par SQLite, en UTC, ou ISO complet) : on les ramène toutes à l'ISO.
function dateSqliteVersIso(d: string): string {
  const texte = d.includes("T") ? d : d.replace(" ", "T") + "Z";
  const date = new Date(texte);
  return isNaN(date.getTime()) ? d : date.toISOString();
}

export async function annulerEnvoiWhatsapp(evenementId: string) {
  const envoi = db
    .prepare(`SELECT id, contactId, bienId, detail FROM Evenement WHERE id = ? AND typeEvenement = 'whatsapp_envoye'`)
    .get(evenementId) as { id: string; contactId: string | null; bienId: string | null; detail: string | null } | undefined;
  if (!envoi) throw new Error("Envoi introuvable.");

  const dejaAnnule = db
    .prepare(`SELECT 1 FROM Evenement WHERE typeEvenement = 'whatsapp_non_envoye' AND evenementLieId = ?`)
    .get(evenementId);
  if (!dejaAnnule) {
    db.prepare(
      `INSERT INTO Evenement (id, contactId, bienId, typeEvenement, detail, evenementLieId)
       VALUES (@id, @contactId, @bienId, 'whatsapp_non_envoye', @detail, @lie)`
    ).run({
      id: randomUUID(),
      contactId: envoi.contactId,
      bienId: envoi.bienId,
      detail: envoi.detail,
      lie: envoi.id,
    });
  }

  if (envoi.contactId) {
    const dernier = db
      .prepare(
        `SELECT e.dateEvenement AS d FROM Evenement e
         WHERE e.contactId = ?
           AND e.typeEvenement <> 'whatsapp_non_envoye'
           AND NOT EXISTS (SELECT 1 FROM Evenement a WHERE a.typeEvenement = 'whatsapp_non_envoye' AND a.evenementLieId = e.id)
         ORDER BY julianday(e.dateEvenement) DESC LIMIT 1`
      )
      .get(envoi.contactId) as { d: string | null } | undefined;
    if (dernier?.d) {
      db.prepare(`UPDATE Contact SET dateDernierContact = @d WHERE id = @id`).run({
        id: envoi.contactId,
        d: dateSqliteVersIso(dernier.d),
      });
    }
    revalidatePath(`/contacts/${envoi.contactId}`);
  }
  if (envoi.bienId) revalidatePath(`/biens/${envoi.bienId}`);
  revalidatePath("/journee");
}

// ---------------------------------------------------------------------------
// Photos d'un bien — upload simple (A30/points à trancher : photos vivent
// sur l'hébergement, jamais servies directement par le site). Pas de
// traitement d'image côté serveur ici (recompression/EXIF) : les modules
// natifs sont indisponibles dans ce prototype, le fichier original est
// conservé tel quel — à faire évoluer lors du branchement OVH définitif.
// ---------------------------------------------------------------------------

export async function ajouterPhotosBien(bienId: string, formData: FormData) {
  const fichiers = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (fichiers.length === 0) return;

  const dernierOrdre = db.prepare(`SELECT MAX(ordre) as m FROM BienPhoto WHERE bienId = ?`).get(bienId) as
    | { m: number | null }
    | undefined;
  let ordre = (dernierOrdre?.m ?? -1) + 1;

  for (const fichier of fichiers) {
    const chemin = await enregistrerPhotoPapier(`biens/${bienId}`, fichier);
    if (!chemin) continue;
    db.prepare(
      `INSERT INTO BienPhoto (id, bienId, cheminOriginal, cheminWeb, ordre, exifNettoye)
       VALUES (@id, @bienId, @chemin, @chemin, @ordre, 0)`
    ).run({ id: randomUUID(), bienId, chemin, ordre });
    ordre += 1;
  }

  revalidatePath(`/biens/${bienId}`);
}

export async function supprimerPhotoBien(photoId: string, bienId: string) {
  db.prepare(`DELETE FROM BienPhoto WHERE id = ?`).run(photoId);
  revalidatePath(`/biens/${bienId}`);
}

// ---------------------------------------------------------------------------
// Bons de visite (A30/A31) — un bon par visiteur, jusqu'à quatre biens,
// chaque ligne portant sa propre échéance de non-contournement à 12 mois.
// ---------------------------------------------------------------------------

function prochaineReferenceBonVisite(): string {
  const row = db.prepare(`SELECT reference FROM BonVisite ORDER BY dateCreation DESC LIMIT 1`).get() as
    | { reference: string }
    | undefined;
  const dernierNumero = row ? parseInt(row.reference.replace("BV-", ""), 10) || 0 : 0;
  return `BV-${String(dernierNumero + 1).padStart(4, "0")}`;
}

function plusDouzeMois(dateIso: string): string {
  const d = new Date(dateIso);
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString();
}

export async function creerBonVisite(formData: FormData) {
  const contactId = champTexte(formData, "contactId");
  const bienIds = formData.getAll("bienId").map(String).filter(Boolean).slice(0, 4);
  if (!contactId || bienIds.length === 0) {
    throw new Error("Un visiteur et au moins un bien sont requis pour créer un bon de visite.");
  }

  const bonId = randomUUID();
  const reference = prochaineReferenceBonVisite();
  const maintenant = new Date().toISOString();

  db.prepare(
    `INSERT INTO BonVisite (id, reference, contactId, agent, lieu, dateCreation)
     VALUES (@id, @reference, @contactId, @agent, @lieu, @dateCreation)`
  ).run({
    id: bonId,
    reference,
    contactId,
    agent: champTexte(formData, "agent") ?? "Sébastien",
    lieu: champTexte(formData, "lieu"),
    dateCreation: maintenant,
  });

  for (const bienId of bienIds) {
    const bien = getBien(bienId);
    // Honoraires acquéreur repris du mandat du bien (A30, article 4 du bon) :
    // néant (null) quand les honoraires sont à la charge du vendeur seul.
    const honoraires =
      bien && (bien.honorairesCharge === "acquereur" || bien.honorairesCharge === "partage")
        ? bien.honorairesPourcentage
        : null;

    db.prepare(
      `INSERT INTO BonVisiteLigne (
        id, bonVisiteId, bienId, dateLigne, honorairesAcquereurPourcentage, finNonContournement
      ) VALUES (@id, @bonVisiteId, @bienId, @dateLigne, @honoraires, @finNonContournement)`
    ).run({
      id: randomUUID(),
      bonVisiteId: bonId,
      bienId,
      dateLigne: maintenant,
      honoraires,
      finNonContournement: plusDouzeMois(maintenant),
    });
  }

  db.prepare(`UPDATE Contact SET dateDernierContact = @date WHERE id = @id`).run({
    id: contactId,
    date: maintenant,
  });
  db.prepare(
    `INSERT INTO Evenement (id, contactId, typeEvenement, detail) VALUES (@id, @contactId, 'bon_visite_cree', @detail)`
  ).run({ id: randomUUID(), contactId, detail: `${reference} — ${bienIds.length} bien(s)` });

  revalidatePath(`/contacts/${contactId}`);
  redirect(`/bons-visite/${bonId}`);
}

export async function marquerBonVisiteSigne(bonVisiteId: string, formData: FormData) {
  const dateSignature = champTexte(formData, "dateSignature");
  const fichier = formData.get("photoPapier") as File | null;
  const cheminPhoto = await enregistrerPhotoPapier(`bon-visite-signatures`, fichier);

  db.prepare(
    `UPDATE BonVisite SET signe = 1, dateSignature = @dateSignature,
      photoPapier = COALESCE(@photoPapier, photoPapier)
    WHERE id = @id`
  ).run({ id: bonVisiteId, dateSignature, photoPapier: cheminPhoto });

  revalidatePath(`/bons-visite/${bonVisiteId}`);
}

// ---------------------------------------------------------------------------
// Visites — compte rendu attaché à une ligne de bon (A31).
// ---------------------------------------------------------------------------

const MOTIFS_VISITE_CONNUS = [
  "prix",
  "travaux",
  "surface",
  "quartier",
  "acces_vehicule",
  "luminosite",
  "humidite",
  "bruit",
  "vis_a_vis",
  "agencement",
  "statut_juridique",
];

export async function creerVisite(bonVisiteLigneId: string, formData: FormData) {
  const ligne = db
    .prepare(
      `SELECT bl.bienId, bl.bonVisiteId, bv.contactId FROM BonVisiteLigne bl
       JOIN BonVisite bv ON bv.id = bl.bonVisiteId WHERE bl.id = ?`
    )
    .get(bonVisiteLigneId) as { bienId: string; bonVisiteId: string; contactId: string } | undefined;
  if (!ligne) throw new Error("Ligne de bon de visite introuvable.");

  const motifs = formData.getAll("motif").map(String).filter((m) => MOTIFS_VISITE_CONNUS.includes(m));
  const maintenant = new Date().toISOString();

  db.prepare(
    `INSERT INTO Visite (
      id, bonVisiteLigneId, dateVisite, pieceIdentiteVue, verdict, motifs,
      noteLibre, objectionPrix, suite, dateRelance
    ) VALUES (
      @id, @bonVisiteLigneId, @dateVisite, @pieceIdentiteVue, @verdict, @motifs,
      @noteLibre, @objectionPrix, @suite, @dateRelance
    )`
  ).run({
    id: randomUUID(),
    bonVisiteLigneId,
    dateVisite: maintenant,
    pieceIdentiteVue: formData.get("pieceIdentiteVue") ? 1 : 0,
    verdict: champTexte(formData, "verdict"),
    motifs: motifs.length > 0 ? JSON.stringify(motifs) : null,
    noteLibre: champTexte(formData, "noteLibre"),
    objectionPrix: champNombre(formData, "objectionPrix"),
    suite: champTexte(formData, "suite"),
    dateRelance: champTexte(formData, "dateRelance"),
  });

  db.prepare(`UPDATE Contact SET dateDernierContact = @date WHERE id = @id`).run({
    id: ligne.contactId,
    date: maintenant,
  });
  db.prepare(
    `INSERT INTO Evenement (id, contactId, bienId, typeEvenement, detail)
     VALUES (@id, @contactId, @bienId, 'visite', @detail)`
  ).run({
    id: randomUUID(),
    contactId: ligne.contactId,
    bienId: ligne.bienId,
    detail: champTexte(formData, "verdict") ?? "compte rendu ajouté",
  });

  revalidatePath(`/biens/${ligne.bienId}`);
  revalidatePath(`/contacts/${ligne.contactId}`);
  revalidatePath(`/bons-visite/${ligne.bonVisiteId}`);
}
