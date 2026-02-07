// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import postgres from "postgres";

const PLATFORM_DB_URL_CHIRHO =
  process.env.PLATFORM_DB_URL_CHIRHO ||
  "postgresql://postgres:asdfasdf@localhost:5435/postgres";
const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";

async function importBaseFactsChirho(): Promise<void> {
  console.log("[import-chirho] Connecting to platform-chirho Postgres...");
  const pgChirho = postgres(PLATFORM_DB_URL_CHIRHO);

  console.log("[import-chirho] Opening local SQLite...");
  const dbChirho = new Database(SQLITE_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");
  dbChirho.run("PRAGMA synchronous=NORMAL");

  // === Import words ===
  console.log("[import-chirho] Importing words...");
  const wordsChirho = await pgChirho`
    SELECT w.id, w.verse_id, lf.lemma_id, lf.grammar,
           v.book_id as book, v.chapter, v.number as verse,
           w.text as surface
    FROM word w
    JOIN lemma_form lf ON w.form_id = lf.id
    JOIN verse v ON w.verse_id = v.id
    ORDER BY w.id
  `;

  dbChirho.run("DELETE FROM word_chirho");
  const insertWordChirho = dbChirho.prepare(
    `INSERT OR REPLACE INTO word_chirho
     (id_chirho, verse_id_chirho, lemma_id_chirho, surface_chirho,
      grammar_chirho, book_chirho, chapter_chirho, verse_chirho, position_chirho)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`
  );

  dbChirho.run("BEGIN");
  let wordCountChirho = 0;
  const positionTrackerChirho = new Map<string, number>();

  for (const wChirho of wordsChirho) {
    const verseKeyChirho = wChirho.verse_id;
    const posChirho =
      (positionTrackerChirho.get(verseKeyChirho) || 0) + 1;
    positionTrackerChirho.set(verseKeyChirho, posChirho);

    insertWordChirho.run(
      wChirho.id,
      wChirho.verse_id,
      wChirho.lemma_id,
      wChirho.surface || wChirho.id,
      wChirho.grammar || null,
      wChirho.book,
      wChirho.chapter,
      wChirho.verse,
      posChirho
    );
    wordCountChirho++;
    if (wordCountChirho % 50000 === 0) {
      console.log(`[import-chirho]   ...${wordCountChirho} words`);
    }
  }
  dbChirho.run("COMMIT");
  console.log(`[import-chirho] Imported ${wordCountChirho} words`);

  // === Import lemmas ===
  console.log("[import-chirho] Importing lemmas...");
  // Lemma table only has id; gloss comes from lemma_resource (BDB for Hebrew H*, LSJ for Greek G*)
  const lemmasChirho = await pgChirho`
    SELECT l.id,
           COALESCE(
             (SELECT lr.content FROM lemma_resource lr
              WHERE lr.lemma_id = l.id
              LIMIT 1),
             ''
           ) as gloss
    FROM lemma l
    ORDER BY l.id
  `;

  const lemmasPosChirho = await pgChirho`
    SELECT lemma_id, grammar,
           COUNT(*) as cnt
    FROM lemma_form
    GROUP BY lemma_id, grammar
    ORDER BY lemma_id, cnt DESC
  `;
  const posMapChirho = new Map<string, string>();
  for (const rowChirho of lemmasPosChirho) {
    if (!posMapChirho.has(rowChirho.lemma_id) && rowChirho.grammar) {
      const posTagChirho = rowChirho.grammar.split(",")[0] || rowChirho.grammar;
      posMapChirho.set(rowChirho.lemma_id, posTagChirho);
    }
  }

  dbChirho.run("DELETE FROM lemma_chirho");
  const insertLemmaChirho = dbChirho.prepare(
    `INSERT OR REPLACE INTO lemma_chirho (id_chirho, gloss_chirho, pos_chirho)
     VALUES (?1, ?2, ?3)`
  );

  dbChirho.run("BEGIN");
  let lemmaCountChirho = 0;
  for (const lChirho of lemmasChirho) {
    insertLemmaChirho.run(
      lChirho.id,
      lChirho.gloss || null,
      posMapChirho.get(lChirho.id) || null
    );
    lemmaCountChirho++;
  }
  dbChirho.run("COMMIT");
  console.log(`[import-chirho] Imported ${lemmaCountChirho} lemmas`);

  // === Import glosses ===
  console.log("[import-chirho] Importing glosses...");

  const languagesChirho = await pgChirho`
    SELECT id, code FROM language ORDER BY code
  `;
  console.log(
    `[import-chirho] Found ${languagesChirho.length} languages: ${languagesChirho.map((lChirho: any) => lChirho.code).join(", ")}`
  );

  dbChirho.run("DELETE FROM gloss_import_chirho");
  const insertGlossChirho = dbChirho.prepare(
    `INSERT OR REPLACE INTO gloss_import_chirho
     (word_id_chirho, language_code_chirho, gloss_text_chirho, state_chirho)
     VALUES (?1, ?2, ?3, ?4)`
  );

  let glossCountChirho = 0;
  for (const langChirho of languagesChirho) {
    const glossesChirho = await pgChirho`
      SELECT pw.word_id, g.gloss, g.state, l.code as lang_code
      FROM gloss g
      JOIN phrase p ON g.phrase_id = p.id
      JOIN phrase_word pw ON p.id = pw.phrase_id
      JOIN language l ON p.language_id = l.id
      WHERE l.id = ${langChirho.id}
      AND p.deleted_at IS NULL
      ORDER BY pw.word_id
    `;

    if (glossesChirho.length === 0) continue;

    dbChirho.run("BEGIN");
    for (const gChirho of glossesChirho) {
      if (!gChirho.gloss || gChirho.gloss.trim() === "") continue;
      insertGlossChirho.run(
        gChirho.word_id,
        gChirho.lang_code,
        gChirho.gloss,
        gChirho.state || "UNAPPROVED"
      );
      glossCountChirho++;
    }
    dbChirho.run("COMMIT");
    console.log(
      `[import-chirho]   ${langChirho.code}: ${glossesChirho.length} glosses`
    );
  }
  console.log(`[import-chirho] Imported ${glossCountChirho} total glosses`);

  // === Summary ===
  const wordCheckChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM word_chirho")
    .get();
  const lemmaCheckChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM lemma_chirho")
    .get();
  const glossCheckChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM gloss_import_chirho")
    .get();
  const langCheckChirho: any = dbChirho
    .query(
      "SELECT COUNT(DISTINCT language_code_chirho) as cnt_chirho FROM gloss_import_chirho"
    )
    .get();

  console.log("\n[import-chirho] === SUMMARY ===");
  console.log(`  Words:     ${wordCheckChirho.cnt_chirho}`);
  console.log(`  Lemmas:    ${lemmaCheckChirho.cnt_chirho}`);
  console.log(`  Glosses:   ${glossCheckChirho.cnt_chirho}`);
  console.log(`  Languages: ${langCheckChirho.cnt_chirho}`);

  await pgChirho.end();
  dbChirho.close();
  console.log("[import-chirho] Done.");
}

importBaseFactsChirho();
