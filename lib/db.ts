import Database from "better-sqlite3";
import { seedReferenceData } from "./seedReference";
import fs from "node:fs";
import path from "node:path";

// En production sur Railway, DATA_DIR pointe vers le volume persistant
// (/data) monte sur le service, pour que data.db survive aux redemarrages
// et aux redeploiements. En local (developpement), DATA_DIR n'est pas
// definie et on garde l'ancien emplacement (a la racine du projet).
const DATA_DIR = process.env.DATA_DIR;
const DB_PATH = DATA_DIR ? path.join(DATA_DIR, "data.db") : path.join(process.cwd(), "data.db");
const SCHEMA_PATH = path.join(process.cwd(), "lib", "schema.sql");

declare global {
  // eslint-disable-next-line no-var
  var __crmLamDb: Database.Database | undefined;
}

// Exécute une instruction SQL de migration (ALTER TABLE ADD COLUMN, etc.) en
// ignorant l'erreur si elle a déjà été appliquée. Nécessaire car le build de
// Next.js exécute plusieurs processus en parallèle qui ouvrent chacun une
// connexion à ce même fichier data.db : sans cette protection, deux
// processus qui vérifient l'un après l'autre "la colonne n'existe pas
// encore" puis tentent tous les deux de l'ajouter provoquent une erreur
// "duplicate column name" (ou un verrou SQLITE_BUSY pendant la vérification).
function executerMigration(db: Database.Database, sql: string) {
  try {
    db.exec(sql);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (!message.includes("duplicate column name")) {
      throw e;
    }
  }
}

function createConnection(): Database.Database {
  // Au premier build (et au premier demarrage), le dossier du volume
  // Railway peut ne pas encore exister : on le cree si besoin avant
  // d'ouvrir la base, sinon better-sqlite3 echoue avec "directory does
  // not exist".
  if (DATA_DIR && !fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const db = new Database(DB_PATH);
  // busy_timeout doit etre regle EN PREMIER, avant tout autre pragma ou
  // requete : sinon le changement de journal_mode lui-meme peut echouer
  // avec SQLITE_BUSY si un autre processus (un autre worker du build
  // Next.js, par exemple) a la base ouverte au meme instant.
  db.pragma("busy_timeout = 5000");
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);
  migrer(db);
  seedReferenceData(db);
  return db;
}

// La connexion n'est ouverte qu'au premier usage reel (la premiere requete
// qui execute une requete SQL), jamais au simple chargement du module. Ceci
// est essentiel : pendant "next build", Next.js importe chaque route pour
// l'analyser, y compris les routes marquees force-dynamic qui ne doivent
// jamais toucher la base au build. Si la connexion s'ouvrait des l'import
// (comme avant), plusieurs processus du build tentaient de creer/migrer la
// meme base en meme temps et se bloquaient mutuellement (SQLITE_BUSY).
//
// Le Proxy ci-dessous se comporte exactement comme une vraie connexion
// better-sqlite3 (db.prepare(...), db.exec(...), etc.) pour ne rien changer
// ailleurs dans le code, mais ne cree la vraie connexion qu'a la premiere
// utilisation.
function getConnection(): Database.Database {
  if (!global.__crmLamDb) {
    global.__crmLamDb = createConnection();
  }
  return global.__crmLamDb;
}

export const db: Database.Database = new Proxy({} as Database.Database, {
  get(_target, prop, _receiver) {
    const conn = getConnection();
    const valeur = Reflect.get(conn, prop, conn);
    return typeof valeur === "function" ? valeur.bind(conn) : valeur;
  },
});

// Colonnes ajoutées après la création d'une base existante : CREATE TABLE IF
// NOT EXISTS ne les ajoute pas, on les ajoute ici sans toucher aux données.
function migrer(db: Database.Database) {
  const colonnes = (table: string) =>
    new Set((db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name));

  // 24 septembre 2026 — vouvoiement ou tutoiement, choisi par contact.
  if (!colonnes("Contact").has("formeAdresse")) {
    executerMigration(db, `ALTER TABLE Contact ADD COLUMN formeAdresse TEXT NOT NULL DEFAULT 'vous'`);
  }

  // 24 septembre 2026 — correction d'un envoi WhatsApp : l'historique étant
  // en append-only, l'annulation est un nouvel événement qui pointe vers
  // l'envoi qu'il corrige.
  if (!colonnes("Evenement").has("evenementLieId")) {
    executerMigration(db, `ALTER TABLE Evenement ADD COLUMN evenementLieId TEXT`);
  }

  // 25 septembre 2026 — deux accords distincts (décision 1A) : réponse à la
  // demande (case 1 du site) et prospection (case 2), chacun avec sa date et
  // le texte exact accepté.
  const contact = colonnes("Contact");
  if (!contact.has("texteConsentement")) executerMigration(db, `ALTER TABLE Contact ADD COLUMN texteConsentement TEXT`);
  if (!contact.has("accordReponse")) executerMigration(db, `ALTER TABLE Contact ADD COLUMN accordReponse INTEGER NOT NULL DEFAULT 0`);
  if (!contact.has("dateAccordReponse")) executerMigration(db, `ALTER TABLE Contact ADD COLUMN dateAccordReponse TEXT`);
  if (!contact.has("texteAccordReponse")) executerMigration(db, `ALTER TABLE Contact ADD COLUMN texteAccordReponse TEXT`);

  // 25 septembre 2026 — bloc de pièces « fonds de commerce » (décision 3C :
  // case, cochée d'office pour un fonds vendu fonds / murs et fonds ; NULL =
  // valeur par défaut) et qualité du mandant (mandat V3.1, art. 1).
  const bien = colonnes("Bien");
  if (!bien.has("piecesFonds")) executerMigration(db, `ALTER TABLE Bien ADD COLUMN piecesFonds INTEGER`);
  if (!bien.has("qualiteMandant")) executerMigration(db, `ALTER TABLE Bien ADD COLUMN qualiteMandant TEXT`);

  // 26 septembre 2026 — coordonnées en deux paires (décision 7 du
  // claude/CRM_LAM_decisions_26_septembre.md) : latitude/longitude EXACTES
  // (restreintes, jamais envoyées) et PUBLIÉES (décalées, tirées une seule
  // fois). L'ancien champ latitude/longitude devient latitudeExacte /
  // longitudeExacte ; les coordonnées publiées sont calculées au premier
  // accès par lib/actions.ts (tirerDecalage), pas ici.
  if (!bien.has("latitudeExacte")) {
    executerMigration(db, `ALTER TABLE Bien ADD COLUMN latitudeExacte REAL`);
    executerMigration(db, `ALTER TABLE Bien ADD COLUMN longitudeExacte REAL`);
    executerMigration(db, `ALTER TABLE Bien ADD COLUMN latitudePubliee REAL`);
    executerMigration(db, `ALTER TABLE Bien ADD COLUMN longitudePubliee REAL`);
    if (bien.has("latitude")) {
      executerMigration(db, `UPDATE Bien SET latitudeExacte = latitude, longitudeExacte = longitude WHERE latitude IS NOT NULL`);
    }
  }

  // 27 septembre 2026 — description : texte libre, public, facultatif,
  // remplissable à la publication ou plus tard (demande de Seb). Ne bloque
  // rien, n'entre pas au feu vert de publication.
  if (!bien.has("description")) {
    executerMigration(db, `ALTER TABLE Bien ADD COLUMN description TEXT`);
  }
}
