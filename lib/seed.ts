// Jeu de données de démonstration — reprend les mêmes exemples que le canvas
// de maquettes validé par Seb (LAM-0042, Sophie Bertrand, etc.) pour que le
// prototype ressemble exactement à ce qui a été approuvé.
import { randomUUID } from "node:crypto";
import { db } from "./db";

const TABLES = [
  "Evenement",
  "Demande",
  "Document",
  "Visite",
  "BonVisiteLigne",
  "BonVisite",
  "Recherche",
  "BienPrestation",
  "BienPhoto",
  "Bien",
  "Contact",
  "Prestation",
  "Quartier",
];

function clear() {
  for (const t of TABLES) db.exec(`DELETE FROM ${t};`);
}

function iso(daysAgo: number, hoursAgo = 0): string {
  const d = new Date(Date.now() - daysAgo * 86_400_000 - hoursAgo * 3_600_000);
  return d.toISOString();
}

function run() {
  clear();

  // --- Quartiers -----------------------------------------------------------
  const medinaId = randomUUID();
  const babDoukkalaId = randomUUID();
  const mouassineId = randomUUID();
  const kasbahId = randomUUID();
  const gelizId = randomUUID();
  const palmeraieId = randomUUID();

  const insQuartier = db.prepare(
    `INSERT INTO Quartier (id, nom, quartierParentId, texteIntroductionPublie, datePremierSignalement)
     VALUES (@id, @nom, @quartierParentId, @texteIntroductionPublie, @datePremierSignalement)`
  );
  insQuartier.run({ id: medinaId, nom: "Médina", quartierParentId: null, texteIntroductionPublie: 1, datePremierSignalement: null });
  insQuartier.run({ id: babDoukkalaId, nom: "Bab Doukkala", quartierParentId: medinaId, texteIntroductionPublie: 1, datePremierSignalement: null });
  insQuartier.run({ id: mouassineId, nom: "Mouassine", quartierParentId: medinaId, texteIntroductionPublie: 1, datePremierSignalement: null });
  insQuartier.run({ id: kasbahId, nom: "Kasbah", quartierParentId: medinaId, texteIntroductionPublie: 0, datePremierSignalement: iso(7) });
  insQuartier.run({ id: gelizId, nom: "Guéliz", quartierParentId: null, texteIntroductionPublie: 1, datePremierSignalement: null });
  insQuartier.run({ id: palmeraieId, nom: "Palmeraie", quartierParentId: null, texteIntroductionPublie: 1, datePremierSignalement: null });

  // Liste complète du site (note du 26 septembre), noms à l'identique.
  const autresRacines = ["Hivernage", "Agdal", "Targa", "Amelkis", "Sidi Ghanem", "Route de l'Ourika", "Route de Fès", "Route de Casablanca", "Route d'Amizmiz"];
  for (const nom of autresRacines) {
    insQuartier.run({ id: randomUUID(), nom, quartierParentId: null, texteIntroductionPublie: 0, datePremierSignalement: null });
  }
  const autresMedina = ["Assouel", "Azbezt", "Bab Aylan", "Bab Ghmat", "Bab Laksour", "Bab Taghzout", "Ben Salah", "Berrima", "Dar el Bacha", "Derb Dabachi", "El Mokef", "Essebtiyne", "Hart Soura", "Kennaria", "Ksour", "Medersa Ben Youssef", "Mellah", "Riad Laarouss", "Riad Zitoun", "Sidi Ayoub", "Sidi Ben Slimane", "Sidi Mimoun"];
  for (const nom of autresMedina) {
    insQuartier.run({ id: randomUUID(), nom, quartierParentId: medinaId, texteIntroductionPublie: 0, datePremierSignalement: null });
  }
  for (const nom of ["Bab Atlas", "Circuit de la Palmeraie"]) {
    insQuartier.run({ id: randomUUID(), nom, quartierParentId: palmeraieId, texteIntroductionPublie: 0, datePremierSignalement: null });
  }

  // --- Prestations -----------------------------------------------------------
  const prestationsList: [string, string][] = [
    ["Patio", "exterieurs"], ["Bassin", "exterieurs"], ["Piscine", "exterieurs"],
    ["Rooftop / terrasse", "exterieurs"], ["Jardin", "exterieurs"], ["Puits", "exterieurs"],
    ["Tadelakt", "interieurs"], ["Zellige", "interieurs"], ["Menuiseries en cèdre", "interieurs"],
    ["Cheminée", "interieurs"], ["Hammam", "interieurs"], ["Cuisine équipée", "interieurs"], ["Meublé", "interieurs"],
    ["Climatisation", "equipements"], ["Chauffage", "equipements"], ["Panneaux solaires", "equipements"],
    ["Groupe électrogène", "equipements"], ["Ascenseur", "equipements"], ["Garage / parking", "equipements"], ["Loge de gardien", "equipements"],
    ["Vue Atlas", "situation"], ["Vue Koutoubia", "situation"], ["Accès véhicule", "situation"], ["Calme", "situation"],
  ];
  const insPrestation = db.prepare(`INSERT INTO Prestation (id, nom, groupe) VALUES (?, ?, ?)`);
  const prestationIds: Record<string, string> = {};
  for (const [nom, groupe] of prestationsList) {
    const id = randomUUID();
    prestationIds[nom] = id;
    insPrestation.run(id, nom, groupe);
  }

  // --- Contacts --------------------------------------------------------------
  const insContact = db.prepare(`
    INSERT INTO Contact (id, nom, prenom, telephone, email, cinPasseport, adressePostale, agitPourLeCompteDe,
      statut, motifDeSortie, consentementProspection, dateConsentement, origineConsentement, dateDernierContact,
      anonymise, dateAnonymisation)
    VALUES (@id, @nom, @prenom, @telephone, @email, @cinPasseport, @adressePostale, @agitPourLeCompteDe,
      @statut, @motifDeSortie, @consentementProspection, @dateConsentement, @origineConsentement, @dateDernierContact,
      @anonymise, @dateAnonymisation)
  `);

  const sophieId = randomUUID();
  insContact.run({
    id: sophieId, nom: "Bertrand", prenom: "Sophie", telephone: "+33 6 12 34 56 78",
    email: "sophie.bertrand@mail.com", cinPasseport: "•••• •••• 3821", adressePostale: "14 rue de Rivoli, 75004 Paris",
    agitPourLeCompteDe: null, statut: "en_recherche", motifDeSortie: null,
    consentementProspection: 1, dateConsentement: iso(108), origineConsentement: "formulaire_site",
    dateDernierContact: iso(4), anonymise: 0, dateAnonymisation: null,
  });

  const antoineId = randomUUID();
  insContact.run({
    id: antoineId, nom: "Rousseau", prenom: "Antoine", telephone: "+33 6 98 76 54 32",
    email: "antoine.rousseau@mail.com", cinPasseport: null, adressePostale: null, agitPourLeCompteDe: null,
    statut: "abouti", motifDeSortie: "achete_avec_moi",
    consentementProspection: 1, dateConsentement: iso(400), origineConsentement: "oral_en_visite",
    dateDernierContact: iso(366), anonymise: 0, dateAnonymisation: null,
  });

  const claireId = randomUUID();
  insContact.run({
    id: claireId, nom: "Dubosc", prenom: "Claire", telephone: "+33 6 11 22 33 44", email: "claire.dubosc@mail.com",
    cinPasseport: null, adressePostale: null, agitPourLeCompteDe: null, statut: "en_recherche", motifDeSortie: null,
    consentementProspection: 1, dateConsentement: iso(30), origineConsentement: "whatsapp",
    dateDernierContact: iso(22), anonymise: 0, dateAnonymisation: null,
  });

  const marcId = randomUUID();
  insContact.run({
    id: marcId, nom: "Fontaine", prenom: "Marc", telephone: "+33 6 55 66 77 88", email: "marc.fontaine@mail.com",
    cinPasseport: null, adressePostale: null, agitPourLeCompteDe: null, statut: "en_recherche", motifDeSortie: null,
    consentementProspection: 1, dateConsentement: iso(40), origineConsentement: "email",
    dateDernierContact: iso(30), anonymise: 0, dateAnonymisation: null,
  });

  const karimIdrissiId = randomUUID();
  insContact.run({
    id: karimIdrissiId, nom: "Idrissi", prenom: "Karim", telephone: "+212 6 61 22 33 44", email: null,
    cinPasseport: null, adressePostale: null, agitPourLeCompteDe: null, statut: "nouveau", motifDeSortie: null,
    consentementProspection: 0, dateConsentement: null, origineConsentement: null,
    dateDernierContact: iso(0, 27), anonymise: 0, dateAnonymisation: null,
  });

  const fatimaId = randomUUID();
  insContact.run({
    id: fatimaId, nom: "El Amrani", prenom: "Fatima", telephone: "+212 6 70 11 22 33", email: null,
    cinPasseport: null, adressePostale: null, agitPourLeCompteDe: null, statut: "nouveau", motifDeSortie: null,
    consentementProspection: 0, dateConsentement: null, origineConsentement: null,
    dateDernierContact: iso(5), anonymise: 0, dateAnonymisation: null,
  });

  const karimSamsarId = randomUUID();
  insContact.run({
    id: karimSamsarId, nom: "Bennani", prenom: "Karim", telephone: "+212 6 62 33 44 55", email: null,
    cinPasseport: null, adressePostale: null, agitPourLeCompteDe: null, statut: "nouveau", motifDeSortie: null,
    consentementProspection: 0, dateConsentement: null, origineConsentement: null,
    dateDernierContact: iso(12), anonymise: 0, dateAnonymisation: null,
  });

  // --- Biens -------------------------------------------------------------
  const insBien = db.prepare(`
    INSERT INTO Bien (
      id, reference, titre, description, typeBien, transaction_, ville, quartierId, situation, adresseExacte,
      latitudeExacte, longitudeExacte, latitudePubliee, longitudePubliee, statutJuridique, numeroTitre,
      etatBien, modeExploitation, surfaceSol, surfaceHabitable, surfaceDeveloppee, surfaceTerrain,
      chambres, sallesBain, niveaux, etage, terrainViabilise, constructible,
      licenceExploitationTouristique,
      prixVente, prixSurDemande, prixPlancher, honorairesPourcentage, honorairesMinimumDh, honorairesCharge,
      afficherPrixM2, loyerMensuel, chargesMensuelles, natureVente, prixFonds, prixMurs,
      etatExploitation, activite, capaciteValeur, capaciteUnite, salaries, joursOuverture, horairesOuverture,
      licenceAlcool, droitTerrasse, autorisationExploitation, autorisationExploitationActivite, equipement,
      exclusivite, mentionEditoriale, solutionCleEnMainChiffree,
      diffusionEtat, statutCommercial, motifDeSortie,
      conseillerReferent, notesInternes,
      proprietaireId, apporteurId, apporteurProcurationAuthentique, typeOrigine, acheteurId,
      estimationAgence, estimationDate, estimationFondement, contactAcces, contactAccesTelephone,
      accesPreavis, accesCreneaux, clesConfiees, clesReferenceRecu, partageConfrere, partageConditions,
      frequenceCompteRendu, commissionTauxOuMontant, commissionALaChargeDe, commissionNote,
      createdAt, updatedAt, datePublication
    ) VALUES (
      @id, @reference, @titre, @description, @typeBien, @transaction_, @ville, @quartierId, @situation, @adresseExacte,
      @latitudeExacte, @longitudeExacte, @latitudePubliee, @longitudePubliee, @statutJuridique, @numeroTitre,
      @etatBien, @modeExploitation, @surfaceSol, @surfaceHabitable, @surfaceDeveloppee, @surfaceTerrain,
      @chambres, @sallesBain, @niveaux, @etage, @terrainViabilise, @constructible,
      @licenceExploitationTouristique,
      @prixVente, @prixSurDemande, @prixPlancher, @honorairesPourcentage, @honorairesMinimumDh, @honorairesCharge,
      @afficherPrixM2, @loyerMensuel, @chargesMensuelles, @natureVente, @prixFonds, @prixMurs,
      @etatExploitation, @activite, @capaciteValeur, @capaciteUnite, @salaries, @joursOuverture, @horairesOuverture,
      @licenceAlcool, @droitTerrasse, @autorisationExploitation, @autorisationExploitationActivite, @equipement,
      @exclusivite, @mentionEditoriale, @solutionCleEnMainChiffree,
      @diffusionEtat, @statutCommercial, @motifDeSortie,
      @conseillerReferent, @notesInternes,
      @proprietaireId, @apporteurId, @apporteurProcurationAuthentique, @typeOrigine, @acheteurId,
      @estimationAgence, @estimationDate, @estimationFondement, @contactAcces, @contactAccesTelephone,
      @accesPreavis, @accesCreneaux, @clesConfiees, @clesReferenceRecu, @partageConfrere, @partageConditions,
      @frequenceCompteRendu, @commissionTauxOuMontant, @commissionALaChargeDe, @commissionNote,
      @createdAt, @updatedAt, @datePublication
    )
  `);

  function bienDefaults(overrides: Record<string, any>) {
    return {
      description: null,
      latitudeExacte: null, longitudeExacte: null, latitudePubliee: null, longitudePubliee: null, statutJuridique: null, numeroTitre: null,
      etatBien: null, modeExploitation: null, surfaceSol: null, surfaceHabitable: null,
      surfaceDeveloppee: null, surfaceTerrain: null, chambres: null, sallesBain: null,
      niveaux: null, etage: null, terrainViabilise: null, constructible: null,
      licenceExploitationTouristique: 0,
      prixVente: null, prixSurDemande: 0, prixPlancher: null, honorairesPourcentage: null,
      honorairesMinimumDh: null, honorairesCharge: null, afficherPrixM2: 0, loyerMensuel: null,
      chargesMensuelles: null, natureVente: null, prixFonds: null, prixMurs: null,
      etatExploitation: null, activite: null, capaciteValeur: null, capaciteUnite: null,
      salaries: null, joursOuverture: null, horairesOuverture: null, licenceAlcool: null,
      droitTerrasse: null, autorisationExploitation: null, autorisationExploitationActivite: null,
      equipement: null,
      exclusivite: 0, mentionEditoriale: null, solutionCleEnMainChiffree: 0,
      diffusionEtat: "publie", statutCommercial: "disponible", motifDeSortie: null,
      conseillerReferent: "Sébastien", notesInternes: null,
      proprietaireId: null, apporteurId: null, apporteurProcurationAuthentique: null,
      typeOrigine: null, acheteurId: null,
      estimationAgence: null, estimationDate: null, estimationFondement: null,
      contactAcces: null, contactAccesTelephone: null, accesPreavis: null, accesCreneaux: null,
      clesConfiees: null, clesReferenceRecu: null, partageConfrere: null, partageConditions: null,
      frequenceCompteRendu: null, commissionTauxOuMontant: null, commissionALaChargeDe: null,
      commissionNote: null,
      situation: null, adresseExacte: null, ville: "Marrakech",
      createdAt: iso(20), updatedAt: iso(1), datePublication: iso(19),
      ...overrides,
    };
  }

  const lam0042Id = randomUUID();
  insBien.run(
    bienDefaults({
      id: lam0042Id, reference: "LAM-0042", titre: "Riad 220 m², Bab Doukkala",
      typeBien: "riad", transaction_: "vente", quartierId: babDoukkalaId,
      situation: "Proche de la place Bab Doukkala", adresseExacte: "Derb El Hammam n°12",
      statutJuridique: "titre_foncier", numeroTitre: "TF 48210/M",
      etatBien: "en_exploitation", modeExploitation: "maison_hotes",
      surfaceSol: 220, surfaceHabitable: 180, niveaux: 2, chambres: 5, sallesBain: 4,
      licenceExploitationTouristique: 1,
      prixVente: 4_200_000, prixPlancher: 3_800_000, honorairesPourcentage: 5, honorairesMinimumDh: 50_000,
      honorairesCharge: "vendeur",
      exclusivite: 1, mentionEditoriale: "coup_de_coeur",
      proprietaireId: fatimaId, apporteurId: karimSamsarId, typeOrigine: "samsar",
      notesInternes: "Vendeur pressé, disponible tous les jours après 17h. A évoqué une baisse possible si offre avant fin octobre.",
      estimationAgence: 4_100_000, estimationDate: iso(7),
      contactAcces: "Gardien", contactAccesTelephone: "06 XX XX XX XX",
      clesConfiees: 1, clesReferenceRecu: "#114", partageConfrere: 0,
      frequenceCompteRendu: "hebdomadaire", commissionTauxOuMontant: "1,5 %", commissionALaChargeDe: "agence",
    })
  );
  for (const nom of ["Patio", "Bassin", "Rooftop / terrasse", "Tadelakt", "Zellige", "Hammam", "Accès véhicule"]) {
    db.prepare(`INSERT INTO BienPrestation (bienId, prestationId) VALUES (?, ?)`).run(lam0042Id, prestationIds[nom]);
  }
  db.prepare(
    `INSERT INTO BienPhoto (id, bienId, cheminOriginal, cheminWeb, ordre, texteAlternatif, exifNettoye)
     VALUES (?, ?, ?, ?, 0, ?, 1)`
  ).run(randomUUID(), lam0042Id, "/biens/LAM-0042/originaux/photo1.heic", "/biens/LAM-0042/web/photo1.webp", "Riad Bab Doukkala — patio");
  db.prepare(
    `INSERT INTO Document (id, typeDocument, bienId, contactId, modeleVersion, dateGeneration, signe, dateSignature)
     VALUES (?, 'mandat', ?, ?, 'V3.1', ?, 1, ?)`
  ).run(randomUUID(), lam0042Id, fatimaId, iso(18), iso(17));

  const lam0027Id = randomUUID();
  insBien.run(
    bienDefaults({
      id: lam0027Id, reference: "LAM-0027", titre: "Riad 185 m², Mouassine",
      typeBien: "riad", transaction_: "vente", quartierId: mouassineId,
      statutJuridique: "titre_foncier", surfaceSol: 185, niveaux: 2, chambres: 4, sallesBain: 3,
      prixVente: 3_950_000, prixPlancher: 3_600_000, honorairesPourcentage: 5, honorairesCharge: "vendeur",
    })
  );

  const lam0035Id = randomUUID();
  insBien.run(
    bienDefaults({
      id: lam0035Id, reference: "LAM-0035", titre: "Riad 240 m², Kasbah",
      typeBien: "riad", transaction_: "vente", quartierId: kasbahId,
      statutJuridique: "melkia", surfaceSol: 240, niveaux: 3, chambres: 6, sallesBain: 5,
      prixVente: 4_450_000, prixPlancher: 4_100_000, honorairesPourcentage: 5, honorairesCharge: "vendeur",
      diffusionEtat: "off_market",
    })
  );

  // Bien secondaire à Kasbah, publié, pour déclencher le signal "quartier sans texte"
  insBien.run(
    bienDefaults({
      id: randomUUID(), reference: "LAM-0044", titre: "Riad 150 m², Kasbah",
      typeBien: "riad", transaction_: "vente", quartierId: kasbahId,
      statutJuridique: "melkia", surfaceSol: 150, niveaux: 2, chambres: 3, sallesBain: 2,
      prixVente: 2_900_000, honorairesCharge: "vendeur",
      createdAt: iso(9), updatedAt: iso(9), datePublication: iso(8),
    })
  );

  const lam0018Id = randomUUID();
  insBien.run(
    bienDefaults({
      id: lam0018Id, reference: "LAM-0018", titre: "Appartement 95 m², Gueliz",
      typeBien: "appartement", transaction_: "vente", quartierId: gelizId,
      statutJuridique: "titre_foncier", surfaceHabitable: 95, etage: 3, chambres: 2, sallesBain: 1,
      prixVente: 1_650_000, honorairesCharge: "vendeur",
    })
  );

  insBien.run(
    bienDefaults({
      id: randomUUID(), reference: "LAM-0009", titre: "Appartement 95 m², Gueliz",
      typeBien: "appartement", transaction_: "vente", quartierId: gelizId,
      surfaceHabitable: 95, etage: 2, chambres: 2, sallesBain: 1,
      prixVente: 1_580_000,
      diffusionEtat: "archive", statutCommercial: "retire", motifDeSortie: "mandat_non_renouvele",
      createdAt: iso(220), updatedAt: iso(183), datePublication: null,
    })
  );

  insBien.run(
    bienDefaults({
      id: randomUUID(), reference: "LAM-0003", titre: "Villa 400 m², Palmeraie",
      typeBien: "villa", transaction_: "vente", quartierId: palmeraieId,
      surfaceSol: 400, surfaceHabitable: 320, surfaceTerrain: 1200, chambres: 6, sallesBain: 5,
      prixVente: 6_200_000,
      diffusionEtat: "archive", statutCommercial: "retire", motifDeSortie: "abandon",
      createdAt: iso(210), updatedAt: iso(170), datePublication: null,
    })
  );

  insBien.run(
    bienDefaults({
      id: randomUUID(), reference: "LAM-0050", titre: "Appartement 90 m², Gueliz",
      typeBien: "appartement", transaction_: "vente", quartierId: gelizId,
      surfaceHabitable: 90, etage: 1, chambres: 2, sallesBain: 1,
      prixVente: 1_500_000,
      statutCommercial: "vendu", motifDeSortie: "vendu_par_nous", acheteurId: antoineId,
      createdAt: iso(400), updatedAt: iso(366), datePublication: iso(390),
    })
  );

  // --- Recherches --------------------------------------------------------
  const insRecherche = db.prepare(`
    INSERT INTO Recherche (id, contactId, typeBien, quartierId, surfaceSolMin, budgetMax,
      modeExploitationRecherche, messageProspect, criteresLibres, statut, createdAt)
    VALUES (@id, @contactId, @typeBien, @quartierId, @surfaceSolMin, @budgetMax,
      @modeExploitationRecherche, @messageProspect, @criteresLibres, @statut, @createdAt)
  `);
  const rechercheSophieId = randomUUID();
  insRecherche.run({
    id: rechercheSophieId, contactId: sophieId, typeBien: "riad", quartierId: medinaId,
    surfaceSolMin: 200, budgetMax: 4_500_000, modeExploitationRecherche: null,
    messageProspect:
      "Je cherche un riad à rénover dans la médina, avec un vrai potentiel pour une maison d'hôtes de charme. Budget flexible si le bien le mérite.",
    criteresLibres: "Préfère Bab Doukkala ou Mouassine. Ne visitera pas avant novembre.",
    statut: "actif", createdAt: iso(108),
  });
  insRecherche.run({
    id: randomUUID(), contactId: claireId, typeBien: "riad", quartierId: medinaId,
    surfaceSolMin: null, budgetMax: 4_800_000, modeExploitationRecherche: "en_exploitation",
    messageProspect: "Un riad déjà en exploitation, idéalement une maison d'hôtes qui tourne déjà.",
    criteresLibres: null, statut: "actif", createdAt: iso(22),
  });
  insRecherche.run({
    id: randomUUID(), contactId: marcId, typeBien: "riad", quartierId: mouassineId,
    surfaceSolMin: 250, budgetMax: 5_000_000, modeExploitationRecherche: null,
    messageProspect: "Un grand riad à Mouassine, 250 m² minimum.",
    criteresLibres: null, statut: "actif", createdAt: iso(30),
  });

  // --- Demandes ------------------------------------------------------------
  const insDemande = db.prepare(`
    INSERT INTO Demande (id, typeDemande, nom, email, telephone, bienId, message, lu,
      dateReception, dateReponse, alerteEnvoyee, typeBienEstime, quartierTexte, surfaceTexte,
      statutTitreEstime, exploite)
    VALUES (@id, @typeDemande, @nom, @email, @telephone, @bienId, @message, @lu,
      @dateReception, @dateReponse, @alerteEnvoyee, @typeBienEstime, @quartierTexte, @surfaceTexte,
      @statutTitreEstime, @exploite)
  `);
  insDemande.run({
    id: randomUUID(), typeDemande: "question_visite", nom: "Karim Idrissi", email: null,
    telephone: "+212 6 61 22 33 44", bienId: lam0018Id,
    message: "Bonjour, ce bien est-il toujours disponible ? Je souhaiterais visiter.",
    lu: 1, dateReception: iso(0, 27), dateReponse: null, alerteEnvoyee: 1,
    typeBienEstime: null, quartierTexte: null, surfaceTexte: null, statutTitreEstime: null, exploite: null,
  });
  insDemande.run({
    id: randomUUID(), typeDemande: "estimation", nom: null, email: "anonyme@mail.com", telephone: null,
    bienId: null, message: "Je souhaite faire estimer ma villa.",
    lu: 1, dateReception: iso(0, 39), dateReponse: null, alerteEnvoyee: 1,
    typeBienEstime: "villa", quartierTexte: "Palmeraie", surfaceTexte: "350 m² environ",
    statutTitreEstime: "je_ne_sais_pas", exploite: 0,
  });

  // --- Événements (historique de Sophie) ------------------------------------
  const insEvt = db.prepare(`
    INSERT INTO Evenement (id, contactId, bienId, typeEvenement, dateEvenement, detail, auteur)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insEvt.run(randomUUID(), sophieId, null, "recherche_creee", iso(108), "Recherche créée — riad, Médina, 200 m² min.", "Sébastien");
  insEvt.run(randomUUID(), sophieId, lam0042Id, "envoi_whatsapp", iso(9), "Envoi WhatsApp — 4 biens préqualifiés", "Sébastien");
  insEvt.run(randomUUID(), sophieId, lam0042Id, "visite", iso(4), "Visite — LAM-0042, verdict : intéressée", "Sébastien");
}

run();
console.log("Base de données réinitialisée et peuplée (data.db).");
