// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

/**
 * Generate batched merge prompts for Opus subagents.
 * Groups multiple lemmas into single prompts for efficiency.
 *
 * Usage:
 *   bun run tools-chirho/gen-batch-prompts-chirho.ts
 *
 * Outputs batch prompt files to output-chirho/merge-batches-chirho/opus-batches-chirho/
 */

import { Database } from "bun:sqlite";
import { mkdirSync, existsSync, writeFileSync } from "fs";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";
const OUTPUT_DIR_CHIRHO =
  "./output-chirho/merge-batches-chirho/opus-batches-chirho";
const DIVERSE_LANGS_CHIRHO = ["eng", "spa", "hin", "arb", "kor", "swa"];

// Batch sizes by sense count
const BATCH_SIZE_CHIRHO: Record<number, number> = {
  2: 20,
  3: 15,
  4: 10,
  5: 10,
  6: 5,
  7: 5,
  8: 5,
  9: 5,
};

const dbChirho = new Database(SQLITE_PATH_CHIRHO, { readonly: true });

if (!existsSync(OUTPUT_DIR_CHIRHO)) {
  mkdirSync(OUTPUT_DIR_CHIRHO, { recursive: true });
}

function generateLemmaBlockChirho(lemmaIdChirho: string): string | null {
  const lemmaChirho: any = dbChirho
    .query(
      "SELECT id_chirho, pos_chirho, substr(gloss_chirho, 1, 80) as gloss_chirho FROM lemma_chirho WHERE id_chirho = ?1"
    )
    .get(lemmaIdChirho);

  if (!lemmaChirho) return null;

  const sensesChirho: any[] = dbChirho
    .query(
      `SELECT s.sense_id_chirho,
              COUNT(sa.occurrence_id_chirho) as occ_count_chirho,
              GROUP_CONCAT(DISTINCT substr(w.grammar_chirho, 1, 30)) as grammars_chirho
       FROM sense_chirho s
       JOIN sense_assignment_chirho sa ON s.sense_id_chirho = sa.sense_id_chirho
       JOIN word_chirho w ON sa.occurrence_id_chirho = w.id_chirho
       WHERE s.lemma_id_chirho = ?1
       GROUP BY s.sense_id_chirho
       ORDER BY occ_count_chirho DESC`
    )
    .all(lemmaIdChirho);

  if (sensesChirho.length < 2) return null;

  const totalOccChirho = sensesChirho.reduce(
    (sChirho: number, rChirho: any) => sChirho + rChirho.occ_count_chirho,
    0
  );

  let blockChirho = `## ${lemmaIdChirho} (POS: ${lemmaChirho.pos_chirho || "?"}, "${lemmaChirho.gloss_chirho || "?"}", ${totalOccChirho} occ, ${sensesChirho.length} senses)\n\n`;

  for (const sChirho of sensesChirho) {
    blockChirho += `- **S${sChirho.sense_id_chirho}** (${sChirho.occ_count_chirho}x) [${(sChirho.grammars_chirho || "").substring(0, 60)}]`;

    const glossPartsChirho: string[] = [];
    for (const langChirho of DIVERSE_LANGS_CHIRHO) {
      const rowsChirho: any[] = dbChirho
        .query(
          `SELECT gi.gloss_text_chirho
           FROM sense_assignment_chirho sa
           JOIN gloss_import_chirho gi ON sa.occurrence_id_chirho = gi.word_id_chirho
           WHERE sa.sense_id_chirho = ?1 AND gi.language_code_chirho = ?2
           GROUP BY gi.gloss_text_chirho
           ORDER BY COUNT(*) DESC
           LIMIT 2`
        )
        .all(sChirho.sense_id_chirho, langChirho);

      if (rowsChirho.length > 0) {
        glossPartsChirho.push(
          `${langChirho}: ${rowsChirho.map((rChirho: any) => rChirho.gloss_text_chirho).join(", ")}`
        );
      }
    }
    blockChirho += ` | ${glossPartsChirho.join(" | ")}\n`;
  }

  return blockChirho;
}

// Get all lemmas with 2-9 senses
const allLemmasChirho: any[] = dbChirho
  .query(
    `SELECT lemma_id_chirho, COUNT(*) as sc
     FROM sense_chirho
     GROUP BY lemma_id_chirho
     HAVING sc BETWEEN 2 AND 9
     ORDER BY sc DESC, lemma_id_chirho`
  )
  .all();

console.log(`Total lemmas to batch: ${allLemmasChirho.length}`);

// Group by sense count
const bySenseCountChirho: Record<number, string[]> = {};
for (const lChirho of allLemmasChirho) {
  const scChirho = lChirho.sc as number;
  if (!bySenseCountChirho[scChirho]) bySenseCountChirho[scChirho] = [];
  bySenseCountChirho[scChirho].push(lChirho.lemma_id_chirho);
}

let batchCountChirho = 0;
const manifestChirho: Array<{
  batchIdChirho: string;
  lemmaIdsChirho: string[];
  senseCountChirho: number;
}> = [];

for (const scStrChirho of Object.keys(bySenseCountChirho).sort(
  (aChirho, bChirho) => parseInt(bChirho) - parseInt(aChirho)
)) {
  const scChirho = parseInt(scStrChirho);
  const lemmaIdsChirho = bySenseCountChirho[scChirho];
  const batchSizeChirho = BATCH_SIZE_CHIRHO[scChirho] || 5;

  for (
    let iChirho = 0;
    iChirho < lemmaIdsChirho.length;
    iChirho += batchSizeChirho
  ) {
    const batchLemmasChirho = lemmaIdsChirho.slice(
      iChirho,
      iChirho + batchSizeChirho
    );
    batchCountChirho++;
    const batchIdChirho = `batch-${String(batchCountChirho).padStart(4, "0")}-s${scChirho}-chirho`;

    let promptChirho = `# Batch Sense Merge Task (${batchLemmasChirho.length} lemmas, each with ${scChirho} senses)

You are a biblical lexicographer. For each lemma below, group the over-split sense clusters into REAL lexicographic senses.

Rules:
- Different grammatical inflections of the same meaning = SAME sense (merge them)
- Different verb stems (Qal vs Hifil, active vs passive) = often DIFFERENT senses
- Literal vs metaphorical uses = DIFFERENT senses
- Every sense ID must appear in exactly one group

For each lemma, the senses are listed with their IDs (S followed by number), occurrence count, grammar tags, and top glosses across languages.

`;

    for (const lidChirho of batchLemmasChirho) {
      const blockChirho = generateLemmaBlockChirho(lidChirho);
      if (blockChirho) {
        promptChirho += blockChirho + "\n";
      }
    }

    promptChirho += `## Response Format

Return a JSON object with one key per lemma ID. Each value is an array of sense groups:

\`\`\`json
{
  "${batchLemmasChirho[0]}": [
    {"labelChirho": "short label", "descriptionChirho": "one sentence", "senseIdsChirho": [id1, id2, ...]}
  ],
  "${batchLemmasChirho.length > 1 ? batchLemmasChirho[1] : "..."}": [...]
}
\`\`\`

IMPORTANT: Return ONLY the JSON object. Every sense ID from every lemma must appear exactly once. Use the numeric sense IDs (without the S prefix).`;

    writeFileSync(`${OUTPUT_DIR_CHIRHO}/${batchIdChirho}.txt`, promptChirho);

    manifestChirho.push({
      batchIdChirho,
      lemmaIdsChirho: batchLemmasChirho,
      senseCountChirho: scChirho,
    });
  }
}

writeFileSync(
  `${OUTPUT_DIR_CHIRHO}/manifest-chirho.json`,
  JSON.stringify(manifestChirho, null, 2)
);

console.log(`Generated ${batchCountChirho} batch prompts`);
console.log(`Manifest: ${OUTPUT_DIR_CHIRHO}/manifest-chirho.json`);

// Summary by sense count
for (const scChirho of Object.keys(bySenseCountChirho)
  .map(Number)
  .sort((a, b) => b - a)) {
  const countChirho = bySenseCountChirho[scChirho].length;
  const bsChirho = BATCH_SIZE_CHIRHO[scChirho] || 5;
  const batchesChirho = Math.ceil(countChirho / bsChirho);
  console.log(
    `  ${scChirho}-sense: ${countChirho} lemmas / ${bsChirho} per batch = ${batchesChirho} batches`
  );
}

dbChirho.close();
