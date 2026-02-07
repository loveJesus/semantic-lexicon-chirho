// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import Database from "better-sqlite3";
import { env } from "$env/dynamic/private";

const SQLITE_PATH_CHIRHO =
  env.SQLITE_PATH_CHIRHO || "../../data-chirho/semantic-chirho.db";

let dbInstanceChirho: Database.Database | null = null;

export function getDbChirho(): Database.Database {
  if (!dbInstanceChirho) {
    dbInstanceChirho = new Database(SQLITE_PATH_CHIRHO);
    dbInstanceChirho.pragma("journal_mode = WAL");
    dbInstanceChirho.pragma("synchronous = NORMAL");
    dbInstanceChirho.pragma("cache_size = -64000");
  }
  return dbInstanceChirho;
}
