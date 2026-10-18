// For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. — John 3:16 (KJV)

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";

let databaseChirho: Database;

beforeEach(async () => {
  databaseChirho = new Database(":memory:");
  databaseChirho.exec(`
    CREATE TABLE lemma_entry_chirho (
      lemma_id_chirho TEXT PRIMARY KEY,
      gloss_terse_chirho TEXT,
      occurrence_count_chirho INTEGER,
      pos_chirho TEXT
    );
    CREATE TABLE lemma_entry_translation_chirho (
      lemma_id_chirho TEXT NOT NULL,
      language_code_chirho TEXT NOT NULL,
      gloss_terse_chirho TEXT,
      PRIMARY KEY (lemma_id_chirho, language_code_chirho)
    );
    CREATE TABLE sense_entry_chirho (
      sense_id_chirho INTEGER PRIMARY KEY,
      lemma_id_chirho TEXT NOT NULL,
      macro32_chirho TEXT,
      ln_domain_chirho TEXT,
      community_chirho TEXT,
      occurrence_count_chirho INTEGER
    );
    CREATE TABLE sense_gloss_chirho (sense_id_chirho INTEGER, language_code_chirho TEXT);
    CREATE TABLE sense_reference_chirho (sense_id_chirho INTEGER, book_chirho INTEGER);
    INSERT INTO lemma_entry_chirho VALUES ('G0001', 'one', 20, 'noun'), ('G0002', 'two', 10, 'verb'), ('G0003', NULL, 5, 'noun');
    INSERT INTO lemma_entry_translation_chirho VALUES ('G0002', 'spa', 'dos');
    INSERT INTO sense_entry_chirho VALUES (1, 'G0001', 'Existence', 'Being', 'Entity', 12), (2, 'G0002', 'Action', 'Doing', 'Act', 8);
    INSERT INTO sense_gloss_chirho VALUES (1, 'eng'), (1, 'spa'), (2, 'eng');
    INSERT INTO sense_reference_chirho VALUES (1, 1), (2, 2);
  `);
  const migrationSqlChirho = await Bun.file(
    new URL("../migrations-chirho/0001_reduce_d1_reads_chirho.sql", import.meta.url),
  ).text();
  databaseChirho.exec(migrationSqlChirho);
});

afterEach(() => {
  databaseChirho.close();
});

describe("lexicon D1 read model migration", () => {
  test("stores fixed counts and language-specific random pools", () => {
    const statsChirho = databaseChirho
      .query("SELECT * FROM lexicon_stat_chirho WHERE singleton_id_chirho = 1")
      .get() as Record<string, number>;
    expect(statsChirho.lemma_count_chirho).toBe(3);
    expect(statsChirho.sense_count_chirho).toBe(2);
    expect(statsChirho.gloss_count_chirho).toBe(3);
    expect(statsChirho.reference_count_chirho).toBe(2);
    expect(statsChirho.english_random_pool_count_chirho).toBe(2);
    expect(statsChirho.spanish_random_pool_count_chirho).toBe(1);
  });

  test("creates the filter and ordering indexes", () => {
    const indexesChirho = databaseChirho
      .query("SELECT name FROM sqlite_master WHERE type = 'index'")
      .all()
      .map((rowChirho) => (rowChirho as { name: string }).name);
    expect(indexesChirho).toContain("idx_sense_macro_ln_chirho");
    expect(indexesChirho).toContain("idx_sense_ln_community_chirho");
    expect(indexesChirho).toContain("idx_sense_community_chirho");
    expect(indexesChirho).toContain("idx_sense_macro32_occurrence_chirho");
    expect(indexesChirho).toContain("idx_lemma_occurrence_chirho");
    expect(indexesChirho).toContain("idx_lemma_pos_chirho");
  });
});

