// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "fs";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";
const LEXICON_PATH_CHIRHO = "./data-chirho/lexicon-chirho.db";
const BATCH_SIZE_CHIRHO = 500;

interface SenseEntryChirho {
  senseIdChirho: number;
  labelChirho: string | null;
  descriptionChirho: string | null;
  occurrenceCountChirho: number;
  communityChirho: string | null;
  lnDomainChirho: string | null;
  macro32Chirho: string | null;
  glossesChirho: Record<string, string[]>;
}

interface LemmaEntryChirho {
  lemmaIdChirho: string;
  glossChirho: string;
  posChirho: string;
  sensesChirho: SenseEntryChirho[];
  totalOccurrencesChirho: number;
}

function createLexiconDbChirho(): Database {
  const dbChirho = new Database(LEXICON_PATH_CHIRHO, { create: true });
  dbChirho.run("PRAGMA journal_mode=WAL");
  dbChirho.run("PRAGMA synchronous=NORMAL");

  dbChirho.run(`CREATE TABLE IF NOT EXISTS lemma_entry_chirho (
    lemma_id_chirho TEXT PRIMARY KEY,
    language_chirho TEXT NOT NULL DEFAULT 'heb',
    gloss_raw_chirho TEXT,
    gloss_clean_chirho TEXT,
    gloss_terse_chirho TEXT,
    gloss_readable_chirho TEXT,
    pos_chirho TEXT,
    sense_count_chirho INTEGER DEFAULT 0,
    occurrence_count_chirho INTEGER DEFAULT 0,
    article_chirho TEXT,
    article_format_chirho TEXT DEFAULT 'markdown'
  )`);

  dbChirho.run(`CREATE TABLE IF NOT EXISTS sense_entry_chirho (
    sense_id_chirho INTEGER PRIMARY KEY,
    lemma_id_chirho TEXT NOT NULL,
    ordinal_chirho INTEGER NOT NULL,
    label_chirho TEXT,
    description_chirho TEXT,
    occurrence_count_chirho INTEGER DEFAULT 0,
    community_chirho TEXT,
    ln_domain_chirho TEXT,
    macro32_chirho TEXT,
    enriched_chirho TEXT,
    FOREIGN KEY (lemma_id_chirho) REFERENCES lemma_entry_chirho(lemma_id_chirho)
  )`);

  dbChirho.run(`CREATE TABLE IF NOT EXISTS sense_gloss_chirho (
    sense_id_chirho INTEGER NOT NULL,
    language_code_chirho TEXT NOT NULL,
    glosses_chirho TEXT NOT NULL,
    PRIMARY KEY (sense_id_chirho, language_code_chirho),
    FOREIGN KEY (sense_id_chirho) REFERENCES sense_entry_chirho(sense_id_chirho)
  )`);

  dbChirho.run(`CREATE TABLE IF NOT EXISTS sense_reference_chirho (
    sense_id_chirho INTEGER NOT NULL,
    book_chirho INTEGER NOT NULL,
    chapter_chirho INTEGER NOT NULL,
    verse_chirho INTEGER NOT NULL,
    word_position_chirho INTEGER NOT NULL,
    PRIMARY KEY (sense_id_chirho, book_chirho, chapter_chirho, verse_chirho, word_position_chirho),
    FOREIGN KEY (sense_id_chirho) REFERENCES sense_entry_chirho(sense_id_chirho)
  )`);

  dbChirho.run(
    "CREATE INDEX IF NOT EXISTS idx_sense_lemma_chirho ON sense_entry_chirho(lemma_id_chirho)"
  );
  dbChirho.run(
    "CREATE INDEX IF NOT EXISTS idx_sense_ref_chirho ON sense_reference_chirho(sense_id_chirho)"
  );

  return dbChirho;
}

function stripHtmlChirho(htmlChirho: string): string {
  return htmlChirho
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function generateLexiconChirho(): void {
  const srcDbChirho = new Database(SQLITE_PATH_CHIRHO, { readonly: true });
  srcDbChirho.run("PRAGMA cache_size=-64000");

  const lexDbChirho = createLexiconDbChirho();

  // Get all lemmas
  const lemmasChirho = srcDbChirho
    .query(
      "SELECT id_chirho, gloss_chirho, pos_chirho FROM lemma_chirho ORDER BY id_chirho"
    )
    .all() as Record<string, any>[];

  console.log(
    `[generate-lexicon-chirho] Processing ${lemmasChirho.length} lemmas...`
  );

  // Prepared statements for source DB
  const sensesStmtChirho = srcDbChirho.prepare(`
    SELECT s.sense_id_chirho, s.label_chirho, s.description_chirho,
           (SELECT COUNT(*) FROM sense_assignment_chirho sa WHERE sa.sense_id_chirho = s.sense_id_chirho) as occ_count
    FROM sense_chirho s
    WHERE s.lemma_id_chirho = ?1
    ORDER BY occ_count DESC
  `);

  const domainStmtChirho = srcDbChirho.prepare(`
    SELECT d.hierarchy_chirho, d.name_chirho, d.description_chirho
    FROM domain_assignment_chirho da
    JOIN domain_chirho d ON da.domain_id_chirho = d.domain_id_chirho
    WHERE da.sense_id_chirho = ?1
  `);

  const glossStmtChirho = srcDbChirho.prepare(`
    SELECT gp.language_code_chirho,
           (SELECT token_chirho FROM dictionary_chirho WHERE encoded_id_chirho = gp.phrase_id_chirho AND type_chirho = 'phrase') as phrase
    FROM gloss_phrase_chirho gp
    WHERE gp.occurrence_id_chirho IN (
      SELECT occurrence_id_chirho FROM sense_assignment_chirho WHERE sense_id_chirho = ?1 LIMIT 20
    )
    GROUP BY gp.language_code_chirho, phrase
    ORDER BY gp.language_code_chirho
  `);

  const refsStmtChirho = srcDbChirho.prepare(`
    SELECT sa.occurrence_id_chirho
    FROM sense_assignment_chirho sa
    WHERE sa.sense_id_chirho = ?1
    LIMIT 50
  `);

  // Prepared statements for lexicon DB
  const insertLemmaChirho = lexDbChirho.prepare(`
    INSERT INTO lemma_entry_chirho
    (lemma_id_chirho, language_chirho, gloss_raw_chirho, gloss_clean_chirho, pos_chirho, sense_count_chirho, occurrence_count_chirho)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
    ON CONFLICT(lemma_id_chirho) DO UPDATE SET
      language_chirho = excluded.language_chirho,
      gloss_raw_chirho = excluded.gloss_raw_chirho,
      gloss_clean_chirho = excluded.gloss_clean_chirho,
      pos_chirho = excluded.pos_chirho,
      sense_count_chirho = excluded.sense_count_chirho,
      occurrence_count_chirho = excluded.occurrence_count_chirho
  `);

  const insertSenseChirho = lexDbChirho.prepare(`
    INSERT INTO sense_entry_chirho
    (sense_id_chirho, lemma_id_chirho, ordinal_chirho, label_chirho, description_chirho, occurrence_count_chirho, community_chirho, ln_domain_chirho, macro32_chirho)
    VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
    ON CONFLICT(sense_id_chirho) DO UPDATE SET
      lemma_id_chirho = excluded.lemma_id_chirho,
      ordinal_chirho = excluded.ordinal_chirho,
      label_chirho = excluded.label_chirho,
      description_chirho = excluded.description_chirho,
      occurrence_count_chirho = excluded.occurrence_count_chirho,
      community_chirho = excluded.community_chirho,
      ln_domain_chirho = excluded.ln_domain_chirho,
      macro32_chirho = excluded.macro32_chirho
  `);

  const insertGlossChirho = lexDbChirho.prepare(`
    INSERT OR REPLACE INTO sense_gloss_chirho (sense_id_chirho, language_code_chirho, glosses_chirho)
    VALUES (?1, ?2, ?3)
  `);

  const insertRefChirho = lexDbChirho.prepare(`
    INSERT OR IGNORE INTO sense_reference_chirho (sense_id_chirho, book_chirho, chapter_chirho, verse_chirho, word_position_chirho)
    VALUES (?1, ?2, ?3, ?4, ?5)
  `);

  lexDbChirho.run("BEGIN");
  let processedChirho = 0;

  for (const lemmaChirho of lemmasChirho) {
    const lemmaIdChirho = lemmaChirho.id_chirho as string;
    const langChirho = lemmaIdChirho.startsWith("G") ? "grc" : "heb";
    const glossRawChirho = (lemmaChirho.gloss_chirho as string) || "";
    const glossCleanChirho = stripHtmlChirho(glossRawChirho);

    const sensesChirho = sensesStmtChirho.all(lemmaIdChirho) as Record<
      string,
      any
    >[];
    let totalOccChirho = 0;

    for (let iChirho = 0; iChirho < sensesChirho.length; iChirho++) {
      const sChirho = sensesChirho[iChirho];
      const senseIdChirho = sChirho.sense_id_chirho as number;
      const occCountChirho = sChirho.occ_count as number;
      totalOccChirho += occCountChirho;

      // Get domains
      const domainsChirho = domainStmtChirho.all(senseIdChirho) as Record<
        string,
        any
      >[];
      let communityChirho = "";
      let lnChirho = "";
      let macroChirho = "";
      for (const dChirho of domainsChirho) {
        if (dChirho.hierarchy_chirho === "community")
          communityChirho =
            (dChirho.description_chirho as string) ||
            (dChirho.name_chirho as string);
        if (dChirho.hierarchy_chirho === "louw_nida")
          lnChirho = dChirho.description_chirho as string;
        if (dChirho.hierarchy_chirho === "macro32")
          macroChirho = dChirho.name_chirho as string;
      }

      insertSenseChirho.run(
        senseIdChirho,
        lemmaIdChirho,
        iChirho + 1,
        sChirho.label_chirho,
        sChirho.description_chirho,
        occCountChirho,
        communityChirho,
        lnChirho,
        macroChirho
      );

      // Get multilingual glosses
      const glossesChirho = glossStmtChirho.all(senseIdChirho) as Record<
        string,
        any
      >[];
      const byLangChirho: Record<string, string[]> = {};
      for (const gChirho of glossesChirho) {
        const langCodeChirho = gChirho.language_code_chirho as string;
        const phraseChirho = gChirho.phrase as string;
        if (!phraseChirho) continue;
        if (!byLangChirho[langCodeChirho]) byLangChirho[langCodeChirho] = [];
        if (!byLangChirho[langCodeChirho].includes(phraseChirho)) {
          byLangChirho[langCodeChirho].push(phraseChirho);
        }
      }
      for (const [langCodeChirho, phrasesChirho] of Object.entries(
        byLangChirho
      )) {
        insertGlossChirho.run(
          senseIdChirho,
          langCodeChirho,
          JSON.stringify(phrasesChirho)
        );
      }

      // Get references (parse word ID into book/chapter/verse/position)
      const refsChirho = refsStmtChirho.all(senseIdChirho) as Record<
        string,
        any
      >[];
      for (const refChirho of refsChirho) {
        const widChirho = String(refChirho.occurrence_id_chirho);
        if (widChirho.length >= 10) {
          const bookChirho = parseInt(widChirho.substring(0, 2));
          const chapChirho = parseInt(widChirho.substring(2, 5));
          const verseChirho = parseInt(widChirho.substring(5, 8));
          const posChirho = parseInt(widChirho.substring(8));
          insertRefChirho.run(
            senseIdChirho,
            bookChirho,
            chapChirho,
            verseChirho,
            posChirho
          );
        }
      }
    }

    insertLemmaChirho.run(
      lemmaIdChirho,
      langChirho,
      glossRawChirho,
      glossCleanChirho,
      lemmaChirho.pos_chirho,
      sensesChirho.length,
      totalOccChirho
    );

    processedChirho++;
    if (processedChirho % 2000 === 0) {
      lexDbChirho.run("COMMIT");
      lexDbChirho.run("BEGIN");
      console.log(
        `[generate-lexicon-chirho] ${processedChirho}/${lemmasChirho.length} lemmas processed`
      );
    }
  }

  lexDbChirho.run("COMMIT");

  // Stats
  const lemmaCountChirho = (
    lexDbChirho
      .query("SELECT COUNT(*) as c FROM lemma_entry_chirho")
      .get() as any
  ).c;
  const senseCountChirho = (
    lexDbChirho
      .query("SELECT COUNT(*) as c FROM sense_entry_chirho")
      .get() as any
  ).c;
  const glossCountChirho = (
    lexDbChirho
      .query("SELECT COUNT(*) as c FROM sense_gloss_chirho")
      .get() as any
  ).c;
  const refCountChirho = (
    lexDbChirho
      .query("SELECT COUNT(*) as c FROM sense_reference_chirho")
      .get() as any
  ).c;

  console.log("\n[generate-lexicon-chirho] === LEXICON STATS ===");
  console.log(`  Lemma entries:     ${lemmaCountChirho}`);
  console.log(`  Sense entries:     ${senseCountChirho}`);
  console.log(`  Gloss records:     ${glossCountChirho}`);
  console.log(`  Reference records: ${refCountChirho}`);

  srcDbChirho.close();
  lexDbChirho.close();
  console.log(`\n[generate-lexicon-chirho] Written to: ${LEXICON_PATH_CHIRHO}`);
}

generateLexiconChirho();
