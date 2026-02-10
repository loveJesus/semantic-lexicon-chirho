// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import { writeFileSync, mkdirSync } from "fs";

const LEXICON_DB_PATH_CHIRHO = "./data-chirho/lexicon-chirho.db";
const SQL_OUTPUT_DIR_CHIRHO = "./output-chirho/exports-chirho/d1-sync-chirho";
const D1_DB_NAME_CHIRHO = "lexicon-chirho";
const ACCOUNT_ID_CHIRHO = "aecd5616f7ef88323e52b6406ba384bd";
const D1_DB_ID_CHIRHO = "dba34731-a9c6-4d5e-b42f-daf6b8061013";
// D1 limit: ~100KB per SQL statement, ~1000 rows per batch to be safe
const BATCH_SIZE_CHIRHO = 200;

function escSqlChirho(valChirho: string | null): string {
  if (valChirho === null || valChirho === undefined) return "NULL";
  return "'" + valChirho.replace(/'/g, "''") + "'";
}

async function mainChirho(): Promise<void> {
  mkdirSync(SQL_OUTPUT_DIR_CHIRHO, { recursive: true });

  const dbChirho = new Database(LEXICON_DB_PATH_CHIRHO, { readonly: true });

  // Get all lemma glosses
  const lemmasChirho = dbChirho
    .query(
      `SELECT lemma_id_chirho, gloss_terse_chirho, gloss_readable_chirho
       FROM lemma_entry_chirho
       WHERE gloss_terse_chirho IS NOT NULL AND gloss_terse_chirho != ''
       ORDER BY lemma_id_chirho`,
    )
    .all() as Record<string, any>[];

  console.log(
    `[sync-glosses-d1-chirho] ${lemmasChirho.length} lemmas with glosses to sync`,
  );

  // Get all enriched sense descriptions
  const sensesChirho = dbChirho
    .query(
      `SELECT sense_id_chirho, enriched_chirho
       FROM sense_entry_chirho
       WHERE enriched_chirho IS NOT NULL AND enriched_chirho != ''
       ORDER BY sense_id_chirho`,
    )
    .all() as Record<string, any>[];

  console.log(
    `[sync-glosses-d1-chirho] ${sensesChirho.length} senses with enriched descriptions to sync`,
  );

  dbChirho.close();

  // Generate and execute lemma gloss UPDATEs in batches
  let batchIdxChirho = 0;
  let successCountChirho = 0;
  let errorCountChirho = 0;

  console.log(`\n[sync-glosses-d1-chirho] Syncing lemma glosses...`);
  for (let iChirho = 0; iChirho < lemmasChirho.length; iChirho += BATCH_SIZE_CHIRHO) {
    const batchChirho = lemmasChirho.slice(iChirho, iChirho + BATCH_SIZE_CHIRHO);
    const statementsChirho: string[] = [];

    for (const lemmaChirho of batchChirho) {
      statementsChirho.push(
        `UPDATE lemma_entry_chirho SET gloss_terse_chirho = ${escSqlChirho(lemmaChirho.gloss_terse_chirho)}, gloss_readable_chirho = ${escSqlChirho(lemmaChirho.gloss_readable_chirho)} WHERE lemma_id_chirho = ${escSqlChirho(lemmaChirho.lemma_id_chirho)};`,
      );
    }

    const sqlChirho = statementsChirho.join("\n");
    const sqlFileChirho = `${SQL_OUTPUT_DIR_CHIRHO}/lemma-batch-${String(batchIdxChirho).padStart(4, "0")}.sql`;
    writeFileSync(sqlFileChirho, sqlChirho);

    // Execute via wrangler
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
      },
    );

    const exitCodeChirho = await procChirho.exited;
    if (exitCodeChirho === 0) {
      successCountChirho += batchChirho.length;
    } else {
      const stderrChirho = await new Response(procChirho.stderr).text();
      console.error(
        `[sync-glosses-d1-chirho] Batch ${batchIdxChirho} failed: ${stderrChirho.slice(0, 200)}`,
      );
      errorCountChirho += batchChirho.length;
    }

    batchIdxChirho++;
    if (batchIdxChirho % 10 === 0) {
      console.log(
        `[sync-glosses-d1-chirho] Lemma batches: ${batchIdxChirho} done, ${successCountChirho} synced, ${errorCountChirho} errors`,
      );
    }
  }

  console.log(
    `[sync-glosses-d1-chirho] Lemma glosses: ${successCountChirho} synced, ${errorCountChirho} errors in ${batchIdxChirho} batches`,
  );

  // Now sync enriched sense descriptions
  console.log(`\n[sync-glosses-d1-chirho] Syncing enriched sense descriptions...`);
  let senseBatchIdxChirho = 0;
  let senseSuccessChirho = 0;
  let senseErrorChirho = 0;

  for (let iChirho = 0; iChirho < sensesChirho.length; iChirho += BATCH_SIZE_CHIRHO) {
    const batchChirho = sensesChirho.slice(iChirho, iChirho + BATCH_SIZE_CHIRHO);
    const statementsChirho: string[] = [];

    for (const senseChirho of batchChirho) {
      statementsChirho.push(
        `UPDATE sense_entry_chirho SET enriched_chirho = ${escSqlChirho(senseChirho.enriched_chirho)} WHERE sense_id_chirho = ${senseChirho.sense_id_chirho};`,
      );
    }

    const sqlChirho = statementsChirho.join("\n");
    const sqlFileChirho = `${SQL_OUTPUT_DIR_CHIRHO}/sense-batch-${String(senseBatchIdxChirho).padStart(4, "0")}.sql`;
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
      },
    );

    const exitCodeChirho = await procChirho.exited;
    if (exitCodeChirho === 0) {
      senseSuccessChirho += batchChirho.length;
    } else {
      const stderrChirho = await new Response(procChirho.stderr).text();
      console.error(
        `[sync-glosses-d1-chirho] Sense batch ${senseBatchIdxChirho} failed: ${stderrChirho.slice(0, 200)}`,
      );
      senseErrorChirho += batchChirho.length;
    }

    senseBatchIdxChirho++;
    if (senseBatchIdxChirho % 10 === 0) {
      console.log(
        `[sync-glosses-d1-chirho] Sense batches: ${senseBatchIdxChirho} done, ${senseSuccessChirho} synced, ${senseErrorChirho} errors`,
      );
    }
  }

  console.log(
    `\n[sync-glosses-d1-chirho] === SYNC COMPLETE ===`,
  );
  console.log(
    `  Lemma glosses: ${successCountChirho} synced, ${errorCountChirho} errors`,
  );
  console.log(
    `  Sense enriched: ${senseSuccessChirho} synced, ${senseErrorChirho} errors`,
  );
}

mainChirho();
