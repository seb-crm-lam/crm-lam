import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DB_PATH = path.join(process.cwd(), "data.db");
const SCHEMA_PATH = path.join(process.cwd(), "lib", "schema.sql");

declare global {
  // eslint-disable-next-line no-var
  var __crmLamDb: Database.Database | undefined;
}

function createConnection(): Database.Database {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  const schema = fs.readFileSync(SCHEMA_PATH, "utf-8");
  db.exec(schema);
  migrer(db);
  return db;
}

// En dev, Next.js recharge les modules à chaque requête : on garde une seule
// connexion en mémoire globale pour ne pas rouvrir le fichier à chaque fois.
export const db: Database.Database = global.__crmLamDb ?? createConnection();
if (process.env.NODE_ENV !== "production") {
  global.__crmLamDb = db;
}

// Colonnes ajoutées après la création d'une base existante : CREATE TABLE IF
// NOT EXISTS ne les ajoute pas, on les ajoute ici sans toucher aux données.
function migrer(db: Database.Database) {
  const colonnes = (table: string) =>
    new Set((db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name));

  // 24 septembre 2026 — vouvoiement ou tutoiement, choisi par contact.
  if (!colonnes("Contact").has("formeAdresse")) {
    db.exec(`ALTER TABLE Contact ADD COLUMN formeAdresse TEXT NOT NULL DEFAULT 'vous'`);
  }

  // 24 septembre 2026 — correction d'un envoi WhatsApp : l'historique étant
  // en append-only, l'annulation est un nouvel événement qui pointe vers
  // l'envoi qu'il corrige.
  if (!colonnes("Evenement").has("evenementLieId")) {
    db.exec(`ALTER TABLE Evenement ADD COLUMN evenementLieId TEXT`);
  }

  // 25 septembre 2026 — deux accords distincts (décision 1A) : réponse à la
  // demande (case 1 du site) et prospection (case 2), chacun avec sa date et
  // le texte exact accepté.
  const contact = colonnes("Contact");
  if (!contact.has("texteConsentement")) db.exec(`ALTER TABLE Contact ADD COLUMN texteConsentement TEXT`);
  if (!contact.has("accordReponse")) db.exec(`ALTER TABLE Contact ADD COLUMN accordReponse INTEGER NOT NULL DEFAULT 0`);
  if (!contact.has("dateAccordReponse")) db.exec(`ALTER TABLE Contact ADD COLUMN dateAccordReponse TEXT`);
  if (!contact.has("texteAccordReponse")) db.exec(`ALTER TABLE Contact ADD COLUMN texteAccordReponse TEXT`);

  // 25 septembre 2026 — bloc de pièces « fonds de commerce » (décision 3C :
  // case, cochée d'office pour un fonds vendu fonds / murs et fonds ; NULL =
  // valeur par défaut) et qualité du mandant (mandat V3.1, art. 1).
  const bien = colonnes("Bien");
  if (!bien.has("piecesFonds")) db.exec(`ALTER TABLE Bien ADD COLUMN piecesFonds INTEGER`);
  if (!bien.has("qualiteMandant")) db.exec(`ALTER TABLE Bien ADD COLUMN qualiteMandant TEXT`);

  // 26 septembre 2026 — coordonnées en deux paires (décision 7 du
  // claude/CRM_LAM_decisions_26_septembre.md) : latitude/longitude EXACTES
  // (restreintes, jamais envoyées) et PUBLIÉES (décalées, tirées une seule
  // fois). L'ancien champ latitude/longitude devient latitudeExacte /
  // longitudeExacte ; les coordonnées publiées sont calculées au premier
  // accès par lib/actions.ts (tirerDecalage), pas ici.
  if (!bien.has("latitudeExacte")) {
    db.exec(`ALTER TABLE Bien ADD COLUMN latitudeExacte REAL`);
    db.exec(`ALTER TABLE Bien ADD COLUMN longitudeExacte REAL`);
    db.exec(`ALTER TABLE Bien ADD COLUMN latitudePubliee REAL`);
    db.exec(`ALTER TABLE Bien ADD COLUMN longitudePubliee REAL`);
    if (bien.has("latitude")) {
      db.exec(`UPDATE Bien SET latitudeExacte = latitude, longitudeExacte = longitude WHERE latitude IS NOT NULL`);
    }
  }

  // 27 septembre 2026 — description : texte libre, public, facultatif,
  // remplissable à la publication ou plus tard (demande de Seb). Ne bloque
  // rien, n'entre pas au feu vert de publication.
  if (!bien.has("description")) {
    db.exec(`ALTER TABLE Bien ADD COLUMN description TEXT`);
  }
}
