// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life. John 3:16

/**
 * restore-glosses-from-d1-chirho.ts
 *
 * Pulls composed glosses (gloss_terse_chirho, gloss_readable_chirho) and
 * enriched sense descriptions (enriched_chirho) from the remote D1 database
 * back into the local lexicon-chirho.db.
 *
 * Also saves a JSON backup before applying.
 *
 * Usage: bun tools-chirho/restore-glosses-from-d1-chirho.ts
 */

import { Database } from "bun:sqlite";
import { writeFileSync, mkdirSync } from "fs";

const ACCOUNT_ID_CHIRHO = "aecd5616f7ef88323e52b6406ba384bd";
const D1_DB_ID_CHIRHO = "dba34731-a9c6-4d5e-b42f-daf6b8061013";
const LEXICON_DB_PATH_CHIRHO = "./data-chirho/lexicon-chirho.db";
const BACKUP_DIR_CHIRHO = "./output-chirho/exports-chirho/d1-backup-chirho";
const BATCH_SIZE_CHIRHO = 500;

// Load env
const envChirho = await Bun.file(".env-chirho").text();
const apiKeyChirho =
  envChirho.match(/CLOUDFLARE_GLOBAL_API_KEY_CHIRHO="?([^"\n]+)"?/)?.[1] || "";
const emailChirho =
  envChirho.match(/CLOUDFLARE_GLOBAL_API_EMAIL_CHIRHO="?([^"\n]+)"?/)?.[1] || "";

if (!apiKeyChirho || !emailChirho) {
  console.error("[ERR] Missing Cloudflare credentials in .env-chirho");
  process.exit(1);
}

interface D1ResponseChirho {
  result: { results: Record<string, any>[] }[];
  success: boolean;
  errors: any[];
}

async function queryD1Chirho(sqlChirho: string): Promise<Record<string, any>[]> {
  const urlChirho = `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID_CHIRHO}/d1/database/${D1_DB_ID_CHIRHO}/query`;
  const respChirho = await fetch(urlChirho, {
    method: "POST",
    headers: {
      "X-Auth-Email": emailChirho,
      "X-Auth-Key": apiKeyChirho,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sql: sqlChirho }),
  });

  if (!respChirho.ok) {
    const txtChirho = await respChirho.text();
    throw new Error(`D1 API error ${respChirho.status}: ${txtChirho.slice(0, 300)}`);
  }

  const dataChirho = (await respChirho.json()) as D1ResponseChirho;
  if (!dataChirho.success || !dataChirho.result?.[0]?.results) {
    throw new Error(`D1 query failed: ${JSON.stringify(dataChirho.errors)}`);
  }
  return dataChirho.result[0].results;
}

async function mainChirho(): Promise<void> {
  mkdirSync(BACKUP_DIR_CHIRHO, { recursive: true });

  console.log("[restore] Fetching lemma glosses from D1...");

  // Step 1: Fetch all lemma glosses from D1 in batches
  const allLemmaGlossesChirho: Record<string, any>[] = [];
  let offsetChirho = 0;
  while (true) {
    const rowsChirho = await queryD1Chirho(
      `SELECT lemma_id_chirho, gloss_terse_chirho, gloss_readable_chirho
       FROM lemma_entry_chirho
       WHERE gloss_terse_chirho IS NOT NULL AND length(gloss_terse_chirho) > 0
       ORDER BY lemma_id_chirho
       LIMIT ${BATCH_SIZE_CHIRHO} OFFSET ${offsetChirho}`
    );
    if (rowsChirho.length === 0) break;
    allLemmaGlossesChirho.push(...rowsChirho);
    offsetChirho += rowsChirho.length;
    if (offsetChirho % 2000 === 0) {
      console.log(`[restore] Fetched ${offsetChirho} lemma glosses...`);
    }
  }
  console.log(`[restore] Total lemma glosses fetched: ${allLemmaGlossesChirho.length}`);

  // Step 2: Fetch all enriched sense descriptions from D1 in batches
  console.log("\n[restore] Fetching enriched sense descriptions from D1...");
  const allEnrichedChirho: Record<string, any>[] = [];
  offsetChirho = 0;
  while (true) {
    const rowsChirho = await queryD1Chirho(
      `SELECT sense_id_chirho, enriched_chirho
       FROM sense_entry_chirho
       WHERE enriched_chirho IS NOT NULL AND length(enriched_chirho) > 0
       ORDER BY sense_id_chirho
       LIMIT ${BATCH_SIZE_CHIRHO} OFFSET ${offsetChirho}`
    );
    if (rowsChirho.length === 0) break;
    allEnrichedChirho.push(...rowsChirho);
    offsetChirho += rowsChirho.length;
    if (offsetChirho % 5000 === 0) {
      console.log(`[restore] Fetched ${offsetChirho} enriched senses...`);
    }
  }
  console.log(`[restore] Total enriched senses fetched: ${allEnrichedChirho.length}`);

  // Step 3: Save JSON backups
  console.log("\n[restore] Saving JSON backups...");
  writeFileSync(
    `${BACKUP_DIR_CHIRHO}/lemma-glosses-backup-chirho.json`,
    JSON.stringify(allLemmaGlossesChirho, null, 2)
  );
  writeFileSync(
    `${BACKUP_DIR_CHIRHO}/enriched-senses-backup-chirho.json`,
    JSON.stringify(allEnrichedChirho, null, 2)
  );
  console.log(`[restore] Backups saved to ${BACKUP_DIR_CHIRHO}/`);

  // Step 4: Apply to local lexicon DB
  console.log("\n[restore] Applying to local lexicon DB...");
  const dbChirho = new Database(LEXICON_DB_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");

  // Ensure columns exist
  try {
    dbChirho.run("ALTER TABLE lemma_entry_chirho ADD COLUMN gloss_terse_chirho TEXT");
  } catch (_eChirho) {
    /* column already exists */
  }
  try {
    dbChirho.run("ALTER TABLE lemma_entry_chirho ADD COLUMN gloss_readable_chirho TEXT");
  } catch (_eChirho) {
    /* column already exists */
  }
  try {
    dbChirho.run("ALTER TABLE sense_entry_chirho ADD COLUMN enriched_chirho TEXT");
  } catch (_eChirho) {
    /* column already exists */
  }

  // Apply lemma glosses
  const updateLemmaChirho = dbChirho.prepare(
    `UPDATE lemma_entry_chirho
     SET gloss_terse_chirho = ?2, gloss_readable_chirho = ?3
     WHERE lemma_id_chirho = ?1`
  );

  let lemmaUpdatedChirho = 0;
  dbChirho.run("BEGIN");
  for (const rowChirho of allLemmaGlossesChirho) {
    const resultChirho = updateLemmaChirho.run(
      rowChirho.lemma_id_chirho,
      rowChirho.gloss_terse_chirho,
      rowChirho.gloss_readable_chirho || null
    );
    if (resultChirho.changes > 0) lemmaUpdatedChirho++;
  }
  dbChirho.run("COMMIT");
  console.log(`[restore] Lemma glosses updated: ${lemmaUpdatedChirho} / ${allLemmaGlossesChirho.length}`);

  // Apply enriched senses
  const updateSenseChirho = dbChirho.prepare(
    `UPDATE sense_entry_chirho SET enriched_chirho = ?2 WHERE sense_id_chirho = ?1`
  );

  let senseUpdatedChirho = 0;
  dbChirho.run("BEGIN");
  for (const rowChirho of allEnrichedChirho) {
    const resultChirho = updateSenseChirho.run(
      rowChirho.sense_id_chirho,
      rowChirho.enriched_chirho
    );
    if (resultChirho.changes > 0) senseUpdatedChirho++;
  }
  dbChirho.run("COMMIT");
  console.log(`[restore] Enriched senses updated: ${senseUpdatedChirho} / ${allEnrichedChirho.length}`);

  // Verify
  const verifyTerseChirho = (
    dbChirho
      .query(
        "SELECT COUNT(*) as c FROM lemma_entry_chirho WHERE gloss_terse_chirho IS NOT NULL AND length(gloss_terse_chirho) > 0"
      )
      .get() as any
  ).c;
  const verifyEnrichedChirho = (
    dbChirho
      .query(
        "SELECT COUNT(*) as c FROM sense_entry_chirho WHERE enriched_chirho IS NOT NULL AND length(enriched_chirho) > 0"
      )
      .get() as any
  ).c;

  dbChirho.close();

  console.log("\n=== RESTORE COMPLETE ===");
  console.log(`  Lemma glosses in local DB: ${verifyTerseChirho}`);
  console.log(`  Enriched senses in local DB: ${verifyEnrichedChirho}`);
  console.log(`  JSON backups: ${BACKUP_DIR_CHIRHO}/`);
}

mainChirho();
