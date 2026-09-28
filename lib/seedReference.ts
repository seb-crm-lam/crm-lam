// Donnees de reference reelles (quartiers de Marrakech et prestations types),
// validees dans le cadrage du projet (voir CRM_LAM_cadrage.md). Inserees une
// seule fois, au premier demarrage sur une base vide (production Railway
// comme developpement local) : si les tables Quartier/Prestation contiennent
// deja des lignes, cette fonction ne fait rien.
import type Database from "better-sqlite3";

interface QuartierSeed {
  id: string;
  nom: string;
  quartierParentId: string | null;
  texteIntroductionPublie: number;
  datePremierSignalement: string | null;
}

interface PrestationSeed {
  id: string;
  nom: string;
  groupe: string;
}

const QUARTIERS: QuartierSeed[] = [
  { id: '700dc90a-90ee-4404-bee3-5ed1993aad53', nom: 'Agdal', quartierParentId: null, texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: 'c3ca4e07-4201-43a7-a49d-c4092448410c', nom: 'Amelkis', quartierParentId: null, texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '7278018b-b928-4b29-9b20-9f2597d52179', nom: 'Assouel', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '78eafc6e-b8f7-49f8-aede-20ac1e8f3f0f', nom: 'Azbezt', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: 'b30b500d-6ea2-4199-9832-6334e61b44a2', nom: 'Bab Atlas', quartierParentId: '1cd0aaed-1bf1-4a0a-bdde-18f7ed3906ee', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '7b88e4e5-bd2d-4bbd-8e3b-099d2029e9e2', nom: 'Bab Aylan', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '850cffc9-9eff-4331-983f-182cf57b756c', nom: 'Bab Doukkala', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 1, datePremierSignalement: null },
  { id: '7cc3a4f9-7856-4d22-8502-41f48d173b7a', nom: 'Bab Ghmat', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: 'cdfdcd9d-77d9-448e-b83b-6e6c4c881d2d', nom: 'Bab Laksour', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: 'ce8e6bcb-6f81-4197-b62d-121e46484b9a', nom: 'Bab Taghzout', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '3f5eef73-afdf-40d0-837c-423f2ebac41d', nom: 'Ben Salah', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '572d9cf5-0449-4242-b81e-be36ef161feb', nom: 'Berrima', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: 'db5f34ed-a367-4c5c-92da-082c429f570f', nom: 'Circuit de la Palmeraie', quartierParentId: '1cd0aaed-1bf1-4a0a-bdde-18f7ed3906ee', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: 'f41e2211-b732-49da-872c-1db30294787d', nom: 'Dar el Bacha', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '6c481070-973d-47a5-a538-00a3f3c378aa', nom: 'Derb Dabachi', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '744f617d-d3be-4fd9-afd3-1c2f2acb0e38', nom: 'El Mokef', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '27a63201-4869-4c98-b23e-a6ab4fc76735', nom: 'Essebtiyne', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: 'a5a6b792-7502-4cf6-bc3d-52b45aa87c5c', nom: 'Guéliz', quartierParentId: null, texteIntroductionPublie: 1, datePremierSignalement: null },
  { id: '4ae8d5b8-ffc6-492f-8a3c-aff1295d789a', nom: 'Hart Soura', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '991aef67-edb8-4c3f-ab5a-9ddbebbbc000', nom: 'Hivernage', quartierParentId: null, texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '0aba88bb-d93d-4134-9c1d-0fc829c67274', nom: 'Kasbah', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: '2026-09-15T13:49:50.491Z' },
  { id: '562c8d0a-4cbe-46fc-806f-7b4783dd931b', nom: 'Kennaria', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '732f24bd-dcec-4727-b079-3684acc0ecd9', nom: 'Ksour', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '9e5ac1d9-b6c8-4df8-9567-3183b7517a24', nom: 'Medersa Ben Youssef', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '4b1e92ce-4cdb-461e-98c5-c5f6a4fb5cc5', nom: 'Mellah', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: 'ddcd9ad6-25e4-456b-ac50-74971e053498', nom: 'Mouassine', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 1, datePremierSignalement: null },
  { id: '483fdcdc-35a8-40ab-be3b-8a830cf97021', nom: 'Médina', quartierParentId: null, texteIntroductionPublie: 1, datePremierSignalement: null },
  { id: '1cd0aaed-1bf1-4a0a-bdde-18f7ed3906ee', nom: 'Palmeraie', quartierParentId: null, texteIntroductionPublie: 1, datePremierSignalement: null },
  { id: '84cb0b1d-49bf-4684-a94a-2706622773b6', nom: 'Riad Laarouss', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: 'd0e42912-8e98-447e-9542-782dc6f243a6', nom: 'Riad Zitoun', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: 'c7baa7a7-6042-4c75-92fa-c3002860caba', nom: 'Route d\'Amizmiz', quartierParentId: null, texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: 'cdf71cfe-8daf-4376-8fb6-88d4de958692', nom: 'Route de Casablanca', quartierParentId: null, texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '75e3621b-f409-4522-a8eb-a762b6c353b1', nom: 'Route de Fès', quartierParentId: null, texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '0105c22a-b275-4f75-8966-a0d392861a14', nom: 'Route de l\'Ourika', quartierParentId: null, texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: 'b0b7f0e4-0d6e-4bc3-ba3b-503776be87af', nom: 'Sidi Ayoub', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '6013a58b-58ef-4562-9472-76c64cff3f23', nom: 'Sidi Ben Slimane', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '8edfa914-0415-45f7-bb07-f18036d9ddfc', nom: 'Sidi Ghanem', quartierParentId: null, texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '255f8e09-8e5f-4772-b58d-9be52f3f4263', nom: 'Sidi Mimoun', quartierParentId: '483fdcdc-35a8-40ab-be3b-8a830cf97021', texteIntroductionPublie: 0, datePremierSignalement: null },
  { id: '4c1c92ad-5355-4350-957c-bff85e22410e', nom: 'Targa', quartierParentId: null, texteIntroductionPublie: 0, datePremierSignalement: null },
];

const PRESTATIONS: PrestationSeed[] = [
  { id: '77406933-e65a-48aa-ae96-35897e8c5067', nom: 'Ascenseur', groupe: 'equipements' },
  { id: 'a6b2d712-8f1d-4817-baf0-3697084e5e8d', nom: 'Chauffage', groupe: 'equipements' },
  { id: '09d282f7-87de-4a25-aac5-95d2241847be', nom: 'Climatisation', groupe: 'equipements' },
  { id: 'be83e383-da04-43b1-8fd3-11d71fdde99b', nom: 'Garage / parking', groupe: 'equipements' },
  { id: '31780602-be76-440a-8f83-edd67f731bdc', nom: 'Groupe électrogène', groupe: 'equipements' },
  { id: '4e17e147-cd85-4529-aa7d-f6e4552c8c6e', nom: 'Loge de gardien', groupe: 'equipements' },
  { id: '9fbc4f0c-ec72-4f28-8367-1d6cef5668d5', nom: 'Panneaux solaires', groupe: 'equipements' },
  { id: 'b949fe1e-30b0-436c-b516-87443af07ef4', nom: 'Bassin', groupe: 'exterieurs' },
  { id: 'aea5ff1c-f544-4e2b-82a4-61cfca740a6e', nom: 'Jardin', groupe: 'exterieurs' },
  { id: '3c55a407-5197-495d-8069-37c4e66d7589', nom: 'Patio', groupe: 'exterieurs' },
  { id: '9107722e-0f4d-4e07-831e-1a43cb869af3', nom: 'Piscine', groupe: 'exterieurs' },
  { id: '3d026757-61a7-4575-9a61-d042c92fd66d', nom: 'Puits', groupe: 'exterieurs' },
  { id: '8d57d4cc-19c0-4c0f-8e1f-05fd4dcd8fd8', nom: 'Rooftop / terrasse', groupe: 'exterieurs' },
  { id: '63873915-0c3d-41b8-ac5d-018ccd2f9c54', nom: 'Cheminée', groupe: 'interieurs' },
  { id: '57af3149-5ca0-4e8c-a12a-d562d87436bd', nom: 'Cuisine équipée', groupe: 'interieurs' },
  { id: '94c7d554-c478-4fc3-9f43-abbd1cc288db', nom: 'Hammam', groupe: 'interieurs' },
  { id: '28fd9390-2303-402f-8879-51dfac639323', nom: 'Menuiseries en cèdre', groupe: 'interieurs' },
  { id: '56ea388c-8190-4c9c-8789-e2d513c31a88', nom: 'Meublé', groupe: 'interieurs' },
  { id: 'a4177fba-d46f-4ce2-a81c-0d7c1f09a57d', nom: 'Tadelakt', groupe: 'interieurs' },
  { id: '69af9af6-1203-4a5d-a416-7845cb7aa5f4', nom: 'Zellige', groupe: 'interieurs' },
  { id: 'd87ad0b8-fc5f-48d7-bd6f-1f01fdf425ad', nom: 'Accès véhicule', groupe: 'situation' },
  { id: '99f66dbd-769e-4fcd-9530-ea5289daed89', nom: 'Calme', groupe: 'situation' },
  { id: 'f907b688-83e8-40c0-8571-b470c7934545', nom: 'Vue Atlas', groupe: 'situation' },
  { id: '3f8dd1e4-4901-4114-bd22-25f276cbc21b', nom: 'Vue Koutoubia', groupe: 'situation' },
];

export function seedReferenceData(db: Database.Database) {
  const quartierCount = (db.prepare("SELECT COUNT(*) c FROM Quartier").get() as { c: number }).c;
  if (quartierCount === 0) {
    const inserer = db.prepare(
      "INSERT INTO Quartier (id, nom, quartierParentId, texteIntroductionPublie, datePremierSignalement) VALUES (@id, @nom, NULL, @texteIntroductionPublie, @datePremierSignalement)"
    );
    const relier = db.prepare("UPDATE Quartier SET quartierParentId = @quartierParentId WHERE id = @id");
    const tout = db.transaction(() => {
      for (const q of QUARTIERS) inserer.run(q);
      for (const q of QUARTIERS) if (q.quartierParentId) relier.run(q);
    });
    tout();
  }

  const prestationCount = (db.prepare("SELECT COUNT(*) c FROM Prestation").get() as { c: number }).c;
  if (prestationCount === 0) {
    const inserer = db.prepare("INSERT INTO Prestation (id, nom, groupe) VALUES (@id, @nom, @groupe)");
    const tout = db.transaction(() => {
      for (const p of PRESTATIONS) inserer.run(p);
    });
    tout();
  }
}
