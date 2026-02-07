// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";

const lemmaIdChirho = process.argv[2];
const jsonFileChirho = process.argv[3];

if (!lemmaIdChirho || !jsonFileChirho) {
  console.error("Usage: bun run apply-merge-response-chirho.ts <lemmaId> <jsonFile>");
  process.exit(1);
}

const responseTextChirho = await Bun.file(jsonFileChirho).text();
const jsonMatchChirho = responseTextChirho.match(/\[[\s\S]*\]/);
if (!jsonMatchChirho) {
  console.error(`No JSON array found for ${lemmaIdChirho}`);
  process.exit(1);
}

const mergeGroupsChirho = JSON.parse(jsonMatchChirho[0]) as Array<{
  labelChirho: string;
  descriptionChirho: string;
  senseIdsChirho: number[];
}>;

const dbChirho = new Database(SQLITE_PATH_CHIRHO);
dbChirho.exec("PRAGMA journal_mode=WAL");

let mergedCountChirho = 0;
let keptCountChirho = 0;

for (const groupChirho of mergeGroupsChirho) {
  if (groupChirho.senseIdsChirho.length <= 1) {
    keptCountChirho++;
    continue;
  }

  const targetIdChirho = groupChirho.senseIdsChirho[0];
  const sourceIdsChirho = groupChirho.senseIdsChirho.slice(1);

  dbChirho
    .query(
      `UPDATE sense_chirho
       SET label_chirho = ?1,
           description_chirho = ?2,
           cluster_method_chirho = COALESCE(cluster_method_chirho, '') || '+llm_merge'
       WHERE sense_id_chirho = ?3`
    )
    .run(groupChirho.labelChirho, groupChirho.descriptionChirho, targetIdChirho);

  for (const sourceIdChirho of sourceIdsChirho) {
    const existsChirho: any = dbChirho
      .query("SELECT COUNT(*) as cnt_chirho FROM sense_chirho WHERE sense_id_chirho = ?1")
      .get(sourceIdChirho);

    if (existsChirho.cnt_chirho > 0) {
      dbChirho
        .query("UPDATE sense_assignment_chirho SET sense_id_chirho = ?1 WHERE sense_id_chirho = ?2")
        .run(targetIdChirho, sourceIdChirho);
      dbChirho
        .query("DELETE FROM sense_chirho WHERE sense_id_chirho = ?1")
        .run(sourceIdChirho);
      mergedCountChirho++;
    }
  }
  keptCountChirho++;
}

console.log(`${lemmaIdChirho}: merged ${mergedCountChirho} senses into ${keptCountChirho} groups`);

// Record progress
const progressFileChirho = "output-chirho/merge-responses-chirho/progress-chirho.jsonl";
const existingTextChirho = await Bun.file(progressFileChirho).exists()
  ? await Bun.file(progressFileChirho).text()
  : "";
const lineChirho = JSON.stringify({
  lemmaIdChirho,
  mergedChirho: mergedCountChirho,
  keptChirho: keptCountChirho,
  timestampChirho: new Date().toISOString(),
});
await Bun.write(progressFileChirho, existingTextChirho + lineChirho + "\n");

dbChirho.close();
