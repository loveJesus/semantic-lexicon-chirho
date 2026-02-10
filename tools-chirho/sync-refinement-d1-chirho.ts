// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life. John 3:16

/**
 * sync-refinement-d1-chirho.ts
 *
 * Syncs the refinement split results to the remote D1 database:
 * 1. INSERT 168 new sub-sense rows into sense_entry_chirho
 * 2. INSERT glosses for new senses into sense_gloss_chirho
 * 3. INSERT references for new senses into sense_reference_chirho
 * 4. UPDATE retired parent senses (label, description, occurrence_count)
 */

import { Database } from "bun:sqlite";
import { writeFileSync, mkdirSync } from "fs";

const LEXICON_DB_PATH_CHIRHO = "./data-chirho/lexicon-chirho.db";
const SQL_OUTPUT_DIR_CHIRHO = "./output-chirho/exports-chirho/d1-sync-refinement-chirho";
const D1_DB_NAME_CHIRHO = "lexicon-chirho";
const BATCH_SIZE_CHIRHO = 100;
const NEW_SENSE_THRESHOLD_CHIRHO = 146136;

function escSqlChirho(valChirho: string | null): string {
  if (valChirho === null || valChirho === undefined) return "NULL";
  return "'" + valChirho.replace(/'/g, "''") + "'";
}

async function execBatchChirho(sqlFileChirho: string, labelChirho: string): Promise<boolean> {
  const procChirho = Bun.spawn(
    ["wrangler", "d1", "execute", D1_DB_NAME_CHIRHO, "--remote", "--file", sqlFileChirho],
    { stdout: "pipe", stderr: "pipe" },
  );
  const exitCodeChirho = await procChirho.exited;
  if (exitCodeChirho !== 0) {
    const stderrChirho = await new Response(procChirho.stderr).text();
    console.error(`[ERR] ${labelChirho}: ${stderrChirho.slice(0, 300)}`);
    return false;
  }
  return true;
}

async function mainChirho(): Promise<void> {
  mkdirSync(SQL_OUTPUT_DIR_CHIRHO, { recursive: true });
  const dbChirho = new Database(LEXICON_DB_PATH_CHIRHO, { readonly: true });

  // 1. New sense entries
  const newSensesChirho = dbChirho
    .query(
      `SELECT sense_id_chirho, lemma_id_chirho, ordinal_chirho, label_chirho,
              description_chirho, occurrence_count_chirho, community_chirho,
              ln_domain_chirho, macro32_chirho, enriched_chirho
       FROM sense_entry_chirho
       WHERE sense_id_chirho >= ?
       ORDER BY sense_id_chirho`,
    )
    .all(NEW_SENSE_THRESHOLD_CHIRHO) as Record<string, any>[];

  console.log(`[sync] ${newSensesChirho.length} new sense entries to INSERT`);

  let batchIdxChirho = 0;
  let successChirho = 0;
  let errorChirho = 0;

  for (let iChirho = 0; iChirho < newSensesChirho.length; iChirho += BATCH_SIZE_CHIRHO) {
    const batchChirho = newSensesChirho.slice(iChirho, iChirho + BATCH_SIZE_CHIRHO);
    const stmtsChirho: string[] = [];
    for (const sChirho of batchChirho) {
      stmtsChirho.push(
        `INSERT OR REPLACE INTO sense_entry_chirho (sense_id_chirho, lemma_id_chirho, ordinal_chirho, label_chirho, description_chirho, occurrence_count_chirho, community_chirho, ln_domain_chirho, macro32_chirho, enriched_chirho) VALUES (${sChirho.sense_id_chirho}, ${escSqlChirho(sChirho.lemma_id_chirho)}, ${sChirho.ordinal_chirho}, ${escSqlChirho(sChirho.label_chirho)}, ${escSqlChirho(sChirho.description_chirho)}, ${sChirho.occurrence_count_chirho}, ${escSqlChirho(sChirho.community_chirho)}, ${escSqlChirho(sChirho.ln_domain_chirho)}, ${escSqlChirho(sChirho.macro32_chirho)}, ${escSqlChirho(sChirho.enriched_chirho)});`,
      );
    }
    const fileChirho = `${SQL_OUTPUT_DIR_CHIRHO}/sense-insert-${String(batchIdxChirho).padStart(4, "0")}.sql`;
    writeFileSync(fileChirho, stmtsChirho.join("\n"));
    if (await execBatchChirho(fileChirho, `sense-insert batch ${batchIdxChirho}`)) {
      successChirho += batchChirho.length;
    } else {
      errorChirho += batchChirho.length;
    }
    batchIdxChirho++;
  }
  console.log(`[sync] Sense entries: ${successChirho} inserted, ${errorChirho} errors`);

  // 2. Glosses for new senses
  const newGlossesChirho = dbChirho
    .query(
      `SELECT sense_id_chirho, language_code_chirho, glosses_chirho
       FROM sense_gloss_chirho
       WHERE sense_id_chirho >= ?
       ORDER BY sense_id_chirho, language_code_chirho`,
    )
    .all(NEW_SENSE_THRESHOLD_CHIRHO) as Record<string, any>[];

  console.log(`\n[sync] ${newGlossesChirho.length} sense glosses to INSERT`);

  batchIdxChirho = 0;
  let glossSuccessChirho = 0;
  let glossErrorChirho = 0;

  for (let iChirho = 0; iChirho < newGlossesChirho.length; iChirho += BATCH_SIZE_CHIRHO) {
    const batchChirho = newGlossesChirho.slice(iChirho, iChirho + BATCH_SIZE_CHIRHO);
    const stmtsChirho: string[] = [];
    for (const gChirho of batchChirho) {
      stmtsChirho.push(
        `INSERT OR REPLACE INTO sense_gloss_chirho (sense_id_chirho, language_code_chirho, glosses_chirho) VALUES (${gChirho.sense_id_chirho}, ${escSqlChirho(gChirho.language_code_chirho)}, ${escSqlChirho(gChirho.glosses_chirho)});`,
      );
    }
    const fileChirho = `${SQL_OUTPUT_DIR_CHIRHO}/gloss-insert-${String(batchIdxChirho).padStart(4, "0")}.sql`;
    writeFileSync(fileChirho, stmtsChirho.join("\n"));
    if (await execBatchChirho(fileChirho, `gloss-insert batch ${batchIdxChirho}`)) {
      glossSuccessChirho += batchChirho.length;
    } else {
      glossErrorChirho += batchChirho.length;
    }
    batchIdxChirho++;
    if (batchIdxChirho % 10 === 0) {
      console.log(`[sync] Gloss batches: ${batchIdxChirho} done, ${glossSuccessChirho} synced`);
    }
  }
  console.log(`[sync] Sense glosses: ${glossSuccessChirho} inserted, ${glossErrorChirho} errors`);

  // 3. References for new senses
  const newRefsChirho = dbChirho
    .query(
      `SELECT sense_id_chirho, book_chirho, chapter_chirho, verse_chirho, word_position_chirho
       FROM sense_reference_chirho
       WHERE sense_id_chirho >= ?
       ORDER BY sense_id_chirho, book_chirho, chapter_chirho, verse_chirho`,
    )
    .all(NEW_SENSE_THRESHOLD_CHIRHO) as Record<string, any>[];

  console.log(`\n[sync] ${newRefsChirho.length} sense references to INSERT`);

  batchIdxChirho = 0;
  let refSuccessChirho = 0;
  let refErrorChirho = 0;

  for (let iChirho = 0; iChirho < newRefsChirho.length; iChirho += BATCH_SIZE_CHIRHO) {
    const batchChirho = newRefsChirho.slice(iChirho, iChirho + BATCH_SIZE_CHIRHO);
    const stmtsChirho: string[] = [];
    for (const rChirho of batchChirho) {
      stmtsChirho.push(
        `INSERT OR REPLACE INTO sense_reference_chirho (sense_id_chirho, book_chirho, chapter_chirho, verse_chirho, word_position_chirho) VALUES (${rChirho.sense_id_chirho}, ${rChirho.book_chirho}, ${rChirho.chapter_chirho}, ${rChirho.verse_chirho}, ${rChirho.word_position_chirho});`,
      );
    }
    const fileChirho = `${SQL_OUTPUT_DIR_CHIRHO}/ref-insert-${String(batchIdxChirho).padStart(4, "0")}.sql`;
    writeFileSync(fileChirho, stmtsChirho.join("\n"));
    if (await execBatchChirho(fileChirho, `ref-insert batch ${batchIdxChirho}`)) {
      refSuccessChirho += batchChirho.length;
    } else {
      refErrorChirho += batchChirho.length;
    }
    batchIdxChirho++;
    if (batchIdxChirho % 10 === 0) {
      console.log(`[sync] Ref batches: ${batchIdxChirho} done, ${refSuccessChirho} synced`);
    }
  }
  console.log(`[sync] Sense references: ${refSuccessChirho} inserted, ${refErrorChirho} errors`);

  // 4. Update retired parent senses
  const retiredChirho = dbChirho
    .query(
      `SELECT sense_id_chirho, label_chirho, description_chirho, occurrence_count_chirho
       FROM sense_entry_chirho
       WHERE label_chirho LIKE '[split]%'
       ORDER BY sense_id_chirho`,
    )
    .all() as Record<string, any>[];

  console.log(`\n[sync] ${retiredChirho.length} retired parent senses to UPDATE`);

  const retiredStmtsChirho: string[] = [];
  for (const rChirho of retiredChirho) {
    retiredStmtsChirho.push(
      `UPDATE sense_entry_chirho SET label_chirho = ${escSqlChirho(rChirho.label_chirho)}, description_chirho = ${escSqlChirho(rChirho.description_chirho)}, occurrence_count_chirho = ${rChirho.occurrence_count_chirho} WHERE sense_id_chirho = ${rChirho.sense_id_chirho};`,
    );
  }
  const retiredFileChirho = `${SQL_OUTPUT_DIR_CHIRHO}/retired-update.sql`;
  writeFileSync(retiredFileChirho, retiredStmtsChirho.join("\n"));
  if (await execBatchChirho(retiredFileChirho, "retired-update")) {
    console.log(`[sync] Retired senses: ${retiredChirho.length} updated`);
  } else {
    console.log(`[sync] Retired senses: FAILED`);
  }

  dbChirho.close();

  console.log(`\n=== D1 SYNC COMPLETE ===`);
  console.log(`  New senses: ${successChirho} / ${newSensesChirho.length}`);
  console.log(`  Glosses: ${glossSuccessChirho} / ${newGlossesChirho.length}`);
  console.log(`  References: ${refSuccessChirho} / ${newRefsChirho.length}`);
  console.log(`  Retired parents: ${retiredChirho.length}`);
}

mainChirho();
