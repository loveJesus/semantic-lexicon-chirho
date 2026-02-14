// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

/**
 * sync-translations-d1-chirho.ts
 *
 * Syncs lemma/sense translations from local lexicon-chirho.db to Cloudflare D1.
 * Reads from lemma_entry_translation_chirho + sense_entry_translation_chirho,
 * generates batched INSERT OR REPLACE SQL, executes via wrangler d1.
 *
 * Usage:
 *   bun run tools-chirho/sync-translations-d1-chirho.ts [--lang=spa]
 *
 * If --lang is omitted, syncs all languages present in the local DB.
 */

import { Database } from "bun:sqlite";
import { writeFileSync, mkdirSync } from "fs";

const LEXICON_DB_PATH_CHIRHO = "./data-chirho/lexicon-chirho.db";
const SQL_OUTPUT_DIR_CHIRHO =
  "./output-chirho/exports-chirho/d1-sync-translations-chirho";
const D1_DB_NAME_CHIRHO = "lexicon-chirho";
const ACCOUNT_ID_CHIRHO = "aecd5616f7ef88323e52b6406ba384bd";
const BATCH_SIZE_CHIRHO = 200;

// Parse CLI args
const argsChirho = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((aChirho) => aChirho.startsWith("--"))
    .map((aChirho) => {
      const [kChirho, vChirho] = aChirho.replace("--", "").split("=");
      return [kChirho, vChirho || "true"];
    })
);
const LANG_FILTER_CHIRHO = argsChirho["lang"] || null;

function escSqlChirho(valChirho: string | null): string {
  if (valChirho === null || valChirho === undefined) return "NULL";
  return "'" + valChirho.replace(/'/g, "''") + "'";
}

async function mainChirho(): Promise<void> {
  mkdirSync(SQL_OUTPUT_DIR_CHIRHO, { recursive: true });

  const dbChirho = new Database(LEXICON_DB_PATH_CHIRHO, { readonly: true });

  // Build WHERE clause for language filter
  const langWhereChirho = LANG_FILTER_CHIRHO
    ? `WHERE language_code_chirho = '${LANG_FILTER_CHIRHO}'`
    : "";

  // Get lemma translations
  const lemmasChirho = dbChirho
    .query(
      `SELECT lemma_id_chirho, language_code_chirho, gloss_terse_chirho, gloss_readable_chirho
       FROM lemma_entry_translation_chirho
       ${langWhereChirho}
       ORDER BY lemma_id_chirho`
    )
    .all() as Record<string, any>[];

  console.log(
    `[sync-translations-d1] ${lemmasChirho.length} lemma translations to sync${LANG_FILTER_CHIRHO ? ` (lang=${LANG_FILTER_CHIRHO})` : ""}`
  );

  // Get sense translations
  const sensesChirho = dbChirho
    .query(
      `SELECT sense_id_chirho, language_code_chirho, label_chirho, enriched_chirho
       FROM sense_entry_translation_chirho
       ${langWhereChirho}
       ORDER BY sense_id_chirho`
    )
    .all() as Record<string, any>[];

  console.log(
    `[sync-translations-d1] ${sensesChirho.length} sense translations to sync`
  );

  dbChirho.close();

  // Sync lemma translations
  let batchIdxChirho = 0;
  let successCountChirho = 0;
  let errorCountChirho = 0;

  console.log(`\n[sync-translations-d1] Syncing lemma translations...`);
  for (
    let iChirho = 0;
    iChirho < lemmasChirho.length;
    iChirho += BATCH_SIZE_CHIRHO
  ) {
    const batchChirho = lemmasChirho.slice(
      iChirho,
      iChirho + BATCH_SIZE_CHIRHO
    );
    const statementsChirho: string[] = [];

    for (const rowChirho of batchChirho) {
      statementsChirho.push(
        `INSERT OR REPLACE INTO lemma_entry_translation_chirho (lemma_id_chirho, language_code_chirho, gloss_terse_chirho, gloss_readable_chirho) VALUES (${escSqlChirho(rowChirho.lemma_id_chirho)}, ${escSqlChirho(rowChirho.language_code_chirho)}, ${escSqlChirho(rowChirho.gloss_terse_chirho)}, ${escSqlChirho(rowChirho.gloss_readable_chirho)});`
      );
    }

    const sqlChirho = statementsChirho.join("\n");
    const sqlFileChirho = `${SQL_OUTPUT_DIR_CHIRHO}/lemma-trans-batch-${String(batchIdxChirho).padStart(4, "0")}.sql`;
    writeFileSync(sqlFileChirho, sqlChirho);

    const procChirho = Bun.spawn(
      [
        "wrangler",
        "d1",
        "execute",
        D1_DB_NAME_CHIRHO,
        "--remote",
        "--file",
        sqlFileChirho,
      ],
      {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID_CHIRHO },
      }
    );

    const exitCodeChirho = await procChirho.exited;
    if (exitCodeChirho === 0) {
      successCountChirho += batchChirho.length;
    } else {
      const stderrChirho = await new Response(procChirho.stderr).text();
      console.error(
        `[sync-translations-d1] Lemma batch ${batchIdxChirho} failed: ${stderrChirho.slice(0, 200)}`
      );
      errorCountChirho += batchChirho.length;
    }

    batchIdxChirho++;
    if (batchIdxChirho % 10 === 0) {
      console.log(
        `[sync-translations-d1] Lemma batches: ${batchIdxChirho} done, ${successCountChirho} synced, ${errorCountChirho} errors`
      );
    }
  }

  console.log(
    `[sync-translations-d1] Lemma translations: ${successCountChirho} synced, ${errorCountChirho} errors in ${batchIdxChirho} batches`
  );

  // Sync sense translations
  console.log(`\n[sync-translations-d1] Syncing sense translations...`);
  let senseBatchIdxChirho = 0;
  let senseSuccessChirho = 0;
  let senseErrorChirho = 0;

  for (
    let iChirho = 0;
    iChirho < sensesChirho.length;
    iChirho += BATCH_SIZE_CHIRHO
  ) {
    const batchChirho = sensesChirho.slice(
      iChirho,
      iChirho + BATCH_SIZE_CHIRHO
    );
    const statementsChirho: string[] = [];

    for (const rowChirho of batchChirho) {
      statementsChirho.push(
        `INSERT OR REPLACE INTO sense_entry_translation_chirho (sense_id_chirho, language_code_chirho, label_chirho, enriched_chirho) VALUES (${rowChirho.sense_id_chirho}, ${escSqlChirho(rowChirho.language_code_chirho)}, ${escSqlChirho(rowChirho.label_chirho)}, ${escSqlChirho(rowChirho.enriched_chirho)});`
      );
    }

    const sqlChirho = statementsChirho.join("\n");
    const sqlFileChirho = `${SQL_OUTPUT_DIR_CHIRHO}/sense-trans-batch-${String(senseBatchIdxChirho).padStart(4, "0")}.sql`;
    writeFileSync(sqlFileChirho, sqlChirho);

    const procChirho = Bun.spawn(
      [
        "wrangler",
        "d1",
        "execute",
        D1_DB_NAME_CHIRHO,
        "--remote",
        "--file",
        sqlFileChirho,
      ],
      {
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: ACCOUNT_ID_CHIRHO },
      }
    );

    const exitCodeChirho = await procChirho.exited;
    if (exitCodeChirho === 0) {
      senseSuccessChirho += batchChirho.length;
    } else {
      const stderrChirho = await new Response(procChirho.stderr).text();
      console.error(
        `[sync-translations-d1] Sense batch ${senseBatchIdxChirho} failed: ${stderrChirho.slice(0, 200)}`
      );
      senseErrorChirho += batchChirho.length;
    }

    senseBatchIdxChirho++;
    if (senseBatchIdxChirho % 10 === 0) {
      console.log(
        `[sync-translations-d1] Sense batches: ${senseBatchIdxChirho} done, ${senseSuccessChirho} synced, ${senseErrorChirho} errors`
      );
    }
  }

  console.log(`\n[sync-translations-d1] === SYNC COMPLETE ===`);
  console.log(
    `  Lemma translations: ${successCountChirho} synced, ${errorCountChirho} errors`
  );
  console.log(
    `  Sense translations: ${senseSuccessChirho} synced, ${senseErrorChirho} errors`
  );
}

mainChirho();
