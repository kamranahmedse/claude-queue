import Database from "better-sqlite3";
import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { initSchema } from "./schema.js";

const DATA_DIR = join(homedir(), ".claude-kanban");
const DB_PATH = join(DATA_DIR, "kanban.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true });
    }

    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");

    initSchema(db);
  }

  return db;
}

export function closeDb() {
  if (db) {
    db.close();
    db = null;
  }
}
