// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import { readFileSync, readdirSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";
const MIGRATIONS_DIR_CHIRHO = "./migrations-chirho";

function migrateChirho(): void {
  const dirChirho = SQLITE_PATH_CHIRHO.substring(
    0,
    SQLITE_PATH_CHIRHO.lastIndexOf("/")
  );
  if (!existsSync(dirChirho)) {
    mkdirSync(dirChirho, { recursive: true });
    console.log(`[migrate-chirho] Created directory: ${dirChirho}`);
  }

  const dbChirho = new Database(SQLITE_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");
  dbChirho.run("PRAGMA synchronous=NORMAL");
  dbChirho.run("PRAGMA cache_size=-64000");
  dbChirho.run("PRAGMA temp_store=MEMORY");

  dbChirho.run(`
    CREATE TABLE IF NOT EXISTS migration_chirho (
      name_chirho TEXT PRIMARY KEY,
      applied_at_chirho TEXT DEFAULT (datetime('now'))
    )
  `);

  const appliedChirho = new Set(
    dbChirho
      .query("SELECT name_chirho FROM migration_chirho")
      .all()
      .map((rowChirho: any) => rowChirho.name_chirho)
  );

  const filesChirho = readdirSync(MIGRATIONS_DIR_CHIRHO)
    .filter((fChirho: string) => fChirho.endsWith(".sql"))
    .sort();

  let appliedCountChirho = 0;
  for (const fileChirho of filesChirho) {
    if (appliedChirho.has(fileChirho)) {
      console.log(`[migrate-chirho] Already applied: ${fileChirho}`);
      continue;
    }

    const sqlChirho = readFileSync(
      join(MIGRATIONS_DIR_CHIRHO, fileChirho),
      "utf-8"
    );
    console.log(`[migrate-chirho] Applying: ${fileChirho}`);
    dbChirho.run(sqlChirho);

    const insertMigrationChirho = dbChirho.prepare(
      "INSERT INTO migration_chirho (name_chirho) VALUES (?1)"
    );
    insertMigrationChirho.run(fileChirho);
    appliedCountChirho++;
  }

  console.log(
    `[migrate-chirho] Done. Applied ${appliedCountChirho} new migration(s).`
  );
  dbChirho.close();
}

migrateChirho();
