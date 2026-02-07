// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import {
  parseMergeResponseChirho,
  applyMergesChirho,
} from "./merge-senses-llm-chirho";
import { readdirSync, readFileSync } from "fs";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";
const dbChirho = new Database(SQLITE_PATH_CHIRHO);

const responseDirChirho = "./output-chirho/merge-responses-chirho";

console.log("[apply-merge-responses-chirho] Reading merge responses...");

const filesChirho = readdirSync(responseDirChirho)
  .filter((fChirho) => fChirho.endsWith("-chirho.json"))
  .sort();

console.log(
  `[apply-merge-responses-chirho] Found ${filesChirho.length} response files`
);

let totalMergedChirho = 0;
let totalRemainingChirho = 0;
let totalFailedChirho = 0;

for (const fileChirho of filesChirho) {
  const dataChirho = JSON.parse(
    readFileSync(`${responseDirChirho}/${fileChirho}`, "utf8")
  );

  for (const entryChirho of dataChirho) {
    const groupsChirho = parseMergeResponseChirho(entryChirho.responseChirho);

    if (!groupsChirho) {
      console.error(`  FAILED to parse: ${entryChirho.lemmaIdChirho}`);
      totalFailedChirho++;
      continue;
    }

    // Validate all sense IDs are accounted for
    const returnedIdsChirho = new Set(
      groupsChirho.flatMap((gChirho) => gChirho.senseIdsChirho)
    );
    const expectedIdsChirho = new Set(
      entryChirho.senseIdsChirho as number[]
    );
    const missingChirho = [...expectedIdsChirho].filter(
      (idChirho) => !returnedIdsChirho.has(idChirho)
    );

    if (missingChirho.length > 0) {
      console.warn(
        `  WARNING: ${entryChirho.lemmaIdChirho} missing ${missingChirho.length} sense IDs — adding as singleton groups`
      );
      // Add missing IDs as singleton groups so no data is lost
      for (const missingIdChirho of missingChirho) {
        groupsChirho.push({
          labelChirho: "unclassified",
          descriptionChirho: "Sense not classified by LLM merge",
          senseIdsChirho: [missingIdChirho],
        });
      }
    }

    const resultChirho = applyMergesChirho(dbChirho, groupsChirho);
    totalMergedChirho += resultChirho.mergedChirho;
    totalRemainingChirho += resultChirho.remainingChirho;
    console.log(
      `  ${entryChirho.lemmaIdChirho}: ` +
        `${entryChirho.senseCountChirho} -> ${resultChirho.remainingChirho} senses ` +
        `(merged ${resultChirho.mergedChirho})`
    );
  }
}

console.log(`\n[apply-merge-responses-chirho] Summary:`);
console.log(`  Total senses merged: ${totalMergedChirho}`);
console.log(`  Total senses remaining: ${totalRemainingChirho}`);
console.log(`  Failed to parse: ${totalFailedChirho}`);

// Report new total
const newTotalChirho: any = dbChirho
  .query("SELECT COUNT(*) as cnt_chirho FROM sense_chirho")
  .get();
console.log(`  New total senses in DB: ${newTotalChirho.cnt_chirho}`);

dbChirho.close();
