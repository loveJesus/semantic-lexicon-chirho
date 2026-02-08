// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

/**
 * Apply all merge response JSON files to the database.
 * Reads each file in output-chirho/merge-responses-chirho/,
 * checks if already applied (sense still exists), and applies if not.
 *
 * Usage: bun run tools-chirho/apply-all-merges-chirho.ts [--dry-run]
 */

import { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "fs";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";
const RESPONSE_DIR_CHIRHO = "./output-chirho/merge-responses-chirho";
const DRY_RUN_CHIRHO = process.argv.includes("--dry-run");

const dbChirho = new Database(SQLITE_PATH_CHIRHO);
dbChirho.exec("PRAGMA journal_mode=WAL");

// Get initial sense count
const initialCountChirho: any = dbChirho
  .query("SELECT COUNT(*) as cnt_chirho FROM sense_chirho")
  .get();
console.log(`Initial sense count: ${initialCountChirho.cnt_chirho}`);

const filesChirho = readdirSync(RESPONSE_DIR_CHIRHO)
  .filter((fChirho) => fChirho.endsWith("-chirho.json"))
  .sort();

console.log(`Found ${filesChirho.length} merge response files`);

let totalMergedChirho = 0;
let totalKeptChirho = 0;
let totalSkippedChirho = 0;
let totalFilesProcessedChirho = 0;

const checkSenseChirho = dbChirho.prepare(
  "SELECT COUNT(*) as cnt_chirho FROM sense_chirho WHERE sense_id_chirho = ?1"
);
const updateSenseChirho = dbChirho.prepare(
  `UPDATE sense_chirho
   SET label_chirho = ?1,
       description_chirho = ?2,
       cluster_method_chirho = COALESCE(cluster_method_chirho, '') || '+llm_merge'
   WHERE sense_id_chirho = ?3`
);
const reassignChirho = dbChirho.prepare(
  "UPDATE sense_assignment_chirho SET sense_id_chirho = ?1 WHERE sense_id_chirho = ?2"
);
const deleteSenseChirho = dbChirho.prepare(
  "DELETE FROM sense_chirho WHERE sense_id_chirho = ?1"
);
const reassignDomainChirho = dbChirho.prepare(
  "UPDATE OR IGNORE domain_assignment_chirho SET sense_id_chirho = ?1 WHERE sense_id_chirho = ?2"
);
const deleteDomainAssignChirho = dbChirho.prepare(
  "DELETE FROM domain_assignment_chirho WHERE sense_id_chirho = ?1"
);

for (const fileChirho of filesChirho) {
  let rawTextChirho = readFileSync(
    `${RESPONSE_DIR_CHIRHO}/${fileChirho}`,
    "utf8"
  );
  // Strip comment lines (some subagents prepend // comments)
  rawTextChirho = rawTextChirho.replace(/^\/\/.*\n/gm, "").trim();
  // Extract JSON array if wrapped in markdown code block
  const jsonMatchChirho = rawTextChirho.match(/\[[\s\S]*\]/);
  if (!jsonMatchChirho) {
    totalSkippedChirho++;
    continue;
  }

  let dataChirho: any[];
  try {
    dataChirho = JSON.parse(jsonMatchChirho[0]);
  } catch {
    console.warn(`  WARN: bad JSON in ${fileChirho}, skipping`);
    totalSkippedChirho++;
    continue;
  }

  if (!Array.isArray(dataChirho)) {
    totalSkippedChirho++;
    continue;
  }

  // Check if this file has already been fully applied (no source senses remain)
  let anyPendingChirho = false;
  for (const groupChirho of dataChirho) {
    if (!groupChirho.senseIdsChirho || groupChirho.senseIdsChirho.length <= 1)
      continue;
    // Check if any source sense (non-target) still exists
    for (
      let iChirho = 1;
      iChirho < groupChirho.senseIdsChirho.length;
      iChirho++
    ) {
      const existsChirho: any = checkSenseChirho.get(
        groupChirho.senseIdsChirho[iChirho]
      );
      if (existsChirho && existsChirho.cnt_chirho > 0) {
        anyPendingChirho = true;
        break;
      }
    }
    if (anyPendingChirho) break;
  }

  if (!anyPendingChirho) {
    totalSkippedChirho++;
    continue;
  }

  // Apply merges in a transaction
  if (!DRY_RUN_CHIRHO) {
    dbChirho.exec("BEGIN");
  }

  let fileMergedChirho = 0;
  let fileKeptChirho = 0;

  for (const groupChirho of dataChirho) {
    if (
      !groupChirho.senseIdsChirho ||
      groupChirho.senseIdsChirho.length <= 1
    ) {
      // Update label even for singletons
      if (groupChirho.senseIdsChirho?.length === 1 && !DRY_RUN_CHIRHO) {
        updateSenseChirho.run(
          groupChirho.labelChirho || "unknown",
          groupChirho.descriptionChirho || "",
          groupChirho.senseIdsChirho[0]
        );
      }
      fileKeptChirho++;
      continue;
    }

    const targetIdChirho = groupChirho.senseIdsChirho[0];
    const sourceIdsChirho = groupChirho.senseIdsChirho.slice(1);

    if (!DRY_RUN_CHIRHO) {
      // Update target sense label
      updateSenseChirho.run(
        groupChirho.labelChirho || "unknown",
        groupChirho.descriptionChirho || "",
        targetIdChirho
      );

      // Merge source senses into target
      for (const sourceIdChirho of sourceIdsChirho) {
        const existsChirho: any = checkSenseChirho.get(sourceIdChirho);
        if (existsChirho && existsChirho.cnt_chirho > 0) {
          reassignChirho.run(targetIdChirho, sourceIdChirho);
          reassignDomainChirho.run(targetIdChirho, sourceIdChirho);
          deleteDomainAssignChirho.run(sourceIdChirho);
          deleteSenseChirho.run(sourceIdChirho);
          fileMergedChirho++;
        }
      }
    } else {
      fileMergedChirho += sourceIdsChirho.length;
    }
    fileKeptChirho++;
  }

  if (!DRY_RUN_CHIRHO) {
    dbChirho.exec("COMMIT");
  }

  totalMergedChirho += fileMergedChirho;
  totalKeptChirho += fileKeptChirho;
  totalFilesProcessedChirho++;

  if (totalFilesProcessedChirho % 200 === 0) {
    console.log(
      `  Applied ${totalFilesProcessedChirho} files, merged ${totalMergedChirho} senses so far...`
    );
  }
}

// Get final sense count
const finalCountChirho: any = dbChirho
  .query("SELECT COUNT(*) as cnt_chirho FROM sense_chirho")
  .get();

console.log(`\n=== Apply All Merges Summary ===`);
console.log(`Files processed: ${totalFilesProcessedChirho}`);
console.log(`Files skipped (already applied): ${totalSkippedChirho}`);
console.log(`Senses merged: ${totalMergedChirho}`);
console.log(`Sense groups kept: ${totalKeptChirho}`);
console.log(
  `Sense count: ${initialCountChirho.cnt_chirho} -> ${finalCountChirho.cnt_chirho}`
);
if (DRY_RUN_CHIRHO) {
  console.log(`(DRY RUN -- no changes made)`);
}

dbChirho.close();
