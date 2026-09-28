import Database from "better-sqlite3";
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
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);
  migrer(db);
  return db;
}

// On garde une seule connexion en mémoire par processus (dev comme
// production) pour ne pas rouvrir le fichier ni relancer les migrations à
// chaque import du module.
export const db: Database.Database = global.__crmLamDb ?? createConnection();
global.__crmLamDb = db;

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
