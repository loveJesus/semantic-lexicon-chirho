// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import {
  extractLemmaSummaryChirho,
  formatPromptChirho,
  MIN_SENSES_CHIRHO,
} from "./merge-senses-llm-chirho";
import { mkdirSync, writeFileSync } from "fs";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";
const dbChirho = new Database(SQLITE_PATH_CHIRHO, { readonly: true });

console.log("[extract-merge-prompts-chirho] Querying over-split lemmas...");

const lemmasChirho: any[] = dbChirho
  .query(
    `SELECT s.lemma_id_chirho, COUNT(*) as sense_count_chirho
     FROM sense_chirho s
     GROUP BY s.lemma_id_chirho
     HAVING COUNT(*) >= ?1
     ORDER BY COUNT(*) DESC`
  )
  .all(MIN_SENSES_CHIRHO);

console.log(
  `[extract-merge-prompts-chirho] Found ${lemmasChirho.length} lemmas with >= ${MIN_SENSES_CHIRHO} senses`
);

const outputDirChirho = "./output-chirho/merge-batches-chirho";
mkdirSync(outputDirChirho, { recursive: true });

interface PromptEntryChirho {
  lemmaIdChirho: string;
  senseCountChirho: number;
  promptChirho: string;
  senseIdsChirho: number[];
}

const allPromptsChirho: PromptEntryChirho[] = [];
let processedChirho = 0;

for (const lemmaChirho of lemmasChirho) {
  const summaryChirho = extractLemmaSummaryChirho(
    dbChirho,
    lemmaChirho.lemma_id_chirho
  );
  if (!summaryChirho) continue;

  allPromptsChirho.push({
    lemmaIdChirho: summaryChirho.lemmaIdChirho,
    senseCountChirho: summaryChirho.sensesChirho.length,
    promptChirho: formatPromptChirho(summaryChirho),
    senseIdsChirho: summaryChirho.sensesChirho.map(
      (sChirho) => sChirho.senseIdChirho
    ),
  });

  processedChirho++;
  if (processedChirho % 100 === 0) {
    console.log(
      `  Processed ${processedChirho}/${lemmasChirho.length} lemmas...`
    );
  }
}

// Write all prompts to a single JSON file
writeFileSync(
  `${outputDirChirho}/all-prompts-chirho.json`,
  JSON.stringify(allPromptsChirho, null, 2)
);

// Tier summary
const tier1Chirho = allPromptsChirho.filter(
  (pChirho) => pChirho.senseCountChirho >= 100
);
const tier2Chirho = allPromptsChirho.filter(
  (pChirho) =>
    pChirho.senseCountChirho >= 50 && pChirho.senseCountChirho < 100
);
const tier3Chirho = allPromptsChirho.filter(
  (pChirho) =>
    pChirho.senseCountChirho >= 16 && pChirho.senseCountChirho < 50
);
const tier4Chirho = allPromptsChirho.filter(
  (pChirho) =>
    pChirho.senseCountChirho >= 10 && pChirho.senseCountChirho < 16
);

console.log(`\n[extract-merge-prompts-chirho] Tier summary:`);
console.log(
  `  Tier 1 (100+ senses): ${tier1Chirho.length} lemmas, ${tier1Chirho.reduce((sChirho, pChirho) => sChirho + pChirho.senseCountChirho, 0)} senses`
);
console.log(
  `  Tier 2 (50-99 senses): ${tier2Chirho.length} lemmas, ${tier2Chirho.reduce((sChirho, pChirho) => sChirho + pChirho.senseCountChirho, 0)} senses`
);
console.log(
  `  Tier 3 (16-49 senses): ${tier3Chirho.length} lemmas, ${tier3Chirho.reduce((sChirho, pChirho) => sChirho + pChirho.senseCountChirho, 0)} senses`
);
console.log(
  `  Tier 4 (10-15 senses): ${tier4Chirho.length} lemmas, ${tier4Chirho.reduce((sChirho, pChirho) => sChirho + pChirho.senseCountChirho, 0)} senses`
);
console.log(
  `  Total: ${allPromptsChirho.length} lemmas, ${allPromptsChirho.reduce((sChirho, pChirho) => sChirho + pChirho.senseCountChirho, 0)} senses`
);
console.log(`\nSaved to ${outputDirChirho}/all-prompts-chirho.json`);

dbChirho.close();
