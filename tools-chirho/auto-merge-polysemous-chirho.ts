// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

/**
 * Auto-merge polysemous lemmas (2-9 senses) using cross-lingual gloss similarity.
 *
 * Strategy:
 * - Normalize English glosses (strip inflection markers, pronouns, tense)
 * - Compute Jaccard similarity between sense clusters across all 6 languages
 * - Merge clusters above similarity threshold
 * - Save merge decisions as JSON files compatible with apply-merges pipeline
 *
 * DISABLED: This script produced low-quality merges compared to Opus LLM review.
 * All sense merging should go through the Opus batch pipeline instead.
 * Kept for reference only.
 *
 * Usage: bun run tools-chirho/auto-merge-polysemous-chirho.ts [--dry-run] [--limit N]
 */

console.error("FAILED: auto-merge-polysemous-chirho is disabled. Use Opus batch merge pipeline instead.");
process.exit(1);

import { Database } from "bun:sqlite";
import { existsSync, mkdirSync, writeFileSync } from "fs";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";
const OUTPUT_DIR_CHIRHO = "./output-chirho/merge-responses-chirho";
const DIVERSE_LANGS_CHIRHO = ["eng", "spa", "hin", "arb", "kor", "swa"];
const MERGE_THRESHOLD_CHIRHO = 0.35; // Jaccard similarity threshold for merging
const DRY_RUN_CHIRHO = process.argv.includes("--dry-run");
const LIMIT_CHIRHO = (() => {
  const idxChirho = process.argv.indexOf("--limit");
  return idxChirho >= 0 ? parseInt(process.argv[idxChirho + 1]) : 0;
})();

interface SenseClusterChirho {
  senseIdChirho: number;
  occCountChirho: number;
  grammarsChirho: string;
  glossesChirho: Record<string, string[]>; // lang -> top glosses
}

interface MergeGroupChirho {
  labelChirho: string;
  descriptionChirho: string;
  senseIdsChirho: number[];
}

/** Normalize an English gloss for comparison. */
function normalizeGlossChirho(glossChirho: string): string {
  let normalizedChirho = glossChirho
    .toLowerCase()
    .replace(/[–\-]/g, " ") // normalize dashes
    .replace(/[.,;:!?'"()\[\]{}]/g, "") // strip punctuation
    .trim();

  // Strip common verb prefixes/pronouns
  const prefixesChirho = [
    "to ", "he ", "she ", "it ", "they ", "we ", "i ", "you ",
    "has ", "had ", "have ", "will ", "shall ", "would ", "could ",
    "is ", "are ", "was ", "were ", "been ", "being ",
    "let ", "may ", "might ", "must ",
    "not ", "do ", "does ", "did ",
  ];

  let changedChirho = true;
  while (changedChirho) {
    changedChirho = false;
    for (const prefixChirho of prefixesChirho) {
      if (normalizedChirho.startsWith(prefixChirho)) {
        normalizedChirho = normalizedChirho.slice(prefixChirho.length);
        changedChirho = true;
      }
    }
  }

  // Strip common suffixes (verb endings)
  normalizedChirho = normalizedChirho
    .replace(/\b(ing|ed|es|er|est|ness|ment|tion|sion|ly)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return normalizedChirho;
}

/** Extract word tokens from a gloss for Jaccard comparison. */
function glossTokensChirho(glossChirho: string): Set<string> {
  const normalizedChirho = normalizeGlossChirho(glossChirho);
  const tokensChirho = new Set<string>();
  for (const wordChirho of normalizedChirho.split(/\s+/)) {
    if (wordChirho.length > 1) {
      tokensChirho.add(wordChirho);
    }
  }
  return tokensChirho;
}

/** Compute Jaccard similarity between two sets. */
function jaccardChirho(aChirho: Set<string>, bChirho: Set<string>): number {
  if (aChirho.size === 0 && bChirho.size === 0) return 1.0;
  if (aChirho.size === 0 || bChirho.size === 0) return 0.0;

  let intersectionChirho = 0;
  for (const itemChirho of aChirho) {
    if (bChirho.has(itemChirho)) intersectionChirho++;
  }
  const unionChirho = aChirho.size + bChirho.size - intersectionChirho;
  return unionChirho > 0 ? intersectionChirho / unionChirho : 0;
}

/** Compute cross-lingual similarity between two sense clusters. */
function crossLingualSimilarityChirho(
  aChirho: SenseClusterChirho,
  bChirho: SenseClusterChirho
): number {
  let totalSimChirho = 0;
  let countChirho = 0;

  for (const langChirho of DIVERSE_LANGS_CHIRHO) {
    const aGlossesChirho = aChirho.glossesChirho[langChirho];
    const bGlossesChirho = bChirho.glossesChirho[langChirho];
    if (!aGlossesChirho || !bGlossesChirho) continue;

    // Combine all glosses for each sense into token sets
    const aTokensChirho = new Set<string>();
    const bTokensChirho = new Set<string>();

    for (const gChirho of aGlossesChirho) {
      for (const tChirho of glossTokensChirho(gChirho)) {
        aTokensChirho.add(`${langChirho}:${tChirho}`);
      }
    }
    for (const gChirho of bGlossesChirho) {
      for (const tChirho of glossTokensChirho(gChirho)) {
        bTokensChirho.add(`${langChirho}:${tChirho}`);
      }
    }

    const simChirho = jaccardChirho(aTokensChirho, bTokensChirho);
    // Weight English more (2x) since it has best coverage
    const weightChirho = langChirho === "eng" ? 2.0 : 1.0;
    totalSimChirho += simChirho * weightChirho;
    countChirho += weightChirho;
  }

  return countChirho > 0 ? totalSimChirho / countChirho : 0;
}

/** Agglomerative merge of sense clusters using cross-lingual similarity. */
function agglomerativeMergeChirho(
  clustersChirho: SenseClusterChirho[],
  thresholdChirho: number
): number[][] {
  // Each element is a list of sense IDs in this group
  const groupsChirho: number[][] = clustersChirho.map((cChirho) => [
    cChirho.senseIdChirho,
  ]);
  // Track which original clusters are in each group
  const groupClustersChirho: SenseClusterChirho[][] = clustersChirho.map(
    (cChirho) => [cChirho]
  );

  let mergedChirho = true;
  while (mergedChirho) {
    mergedChirho = false;
    let bestSimChirho = 0;
    let bestIChirho = -1;
    let bestJChirho = -1;

    // Find most similar pair of groups
    for (let iChirho = 0; iChirho < groupsChirho.length; iChirho++) {
      for (
        let jChirho = iChirho + 1;
        jChirho < groupsChirho.length;
        jChirho++
      ) {
        // Average linkage between all pairs in the two groups
        let simSumChirho = 0;
        let simCountChirho = 0;
        for (const aChirho of groupClustersChirho[iChirho]) {
          for (const bChirho of groupClustersChirho[jChirho]) {
            simSumChirho += crossLingualSimilarityChirho(aChirho, bChirho);
            simCountChirho++;
          }
        }
        const avgSimChirho =
          simCountChirho > 0 ? simSumChirho / simCountChirho : 0;

        if (avgSimChirho > bestSimChirho) {
          bestSimChirho = avgSimChirho;
          bestIChirho = iChirho;
          bestJChirho = jChirho;
        }
      }
    }

    if (bestSimChirho >= thresholdChirho && bestIChirho >= 0) {
      // Merge group j into group i
      groupsChirho[bestIChirho].push(...groupsChirho[bestJChirho]);
      groupClustersChirho[bestIChirho].push(
        ...groupClustersChirho[bestJChirho]
      );
      groupsChirho.splice(bestJChirho, 1);
      groupClustersChirho.splice(bestJChirho, 1);
      mergedChirho = true;
    }
  }

  return groupsChirho;
}

/** Generate a label from the English glosses of a merged group. */
function generateLabelChirho(
  clustersChirho: SenseClusterChirho[],
  senseIdsChirho: number[]
): { labelChirho: string; descriptionChirho: string } {
  const relevantChirho = clustersChirho.filter((cChirho) =>
    senseIdsChirho.includes(cChirho.senseIdChirho)
  );

  // Collect all English glosses, weighted by occurrence count
  const glossCountsChirho = new Map<string, number>();
  for (const cChirho of relevantChirho) {
    const engChirho = cChirho.glossesChirho["eng"] || [];
    for (const gChirho of engChirho) {
      const normalizedChirho = gChirho
        .replace(/[–\-]/g, " ")
        .replace(
          /\b(to|he|she|it|they|we|i|you|has|had|have|will|shall|was|were|being|been|is|are)\b/gi,
          ""
        )
        .replace(/\s+/g, " ")
        .trim();
      if (normalizedChirho.length > 0) {
        glossCountsChirho.set(
          normalizedChirho,
          (glossCountsChirho.get(normalizedChirho) || 0) +
            cChirho.occCountChirho
        );
      }
    }
  }

  // Pick top gloss as label
  const sortedChirho = [...glossCountsChirho.entries()].sort(
    (aChirho, bChirho) => bChirho[1] - aChirho[1]
  );

  const labelChirho =
    sortedChirho.length > 0 ? sortedChirho[0][0].slice(0, 40) : "unknown";

  // Build description from top 2-3 glosses
  const topGlossesChirho = sortedChirho
    .slice(0, 3)
    .map((eChirho) => eChirho[0]);
  const totalOccChirho = relevantChirho.reduce(
    (sChirho, cChirho) => sChirho + cChirho.occCountChirho,
    0
  );
  const descriptionChirho = `${topGlossesChirho.join(", ")} (${totalOccChirho} occurrences across ${senseIdsChirho.length} original clusters)`;

  return { labelChirho, descriptionChirho };
}

// -- Main --

const dbChirho = new Database(SQLITE_PATH_CHIRHO, { readonly: true });
dbChirho.exec("PRAGMA journal_mode = WAL");

if (!existsSync(OUTPUT_DIR_CHIRHO)) {
  mkdirSync(OUTPUT_DIR_CHIRHO, { recursive: true });
}

// Get all unreviewed polysemous lemmas (2-9 senses, no existing merge response)
const unrevLemmasChirho: any[] = dbChirho
  .query(
    `SELECT s.lemma_id_chirho, COUNT(DISTINCT s.sense_id_chirho) as sense_count_chirho
     FROM sense_chirho s
     GROUP BY s.lemma_id_chirho
     HAVING sense_count_chirho BETWEEN 2 AND 9
     ORDER BY sense_count_chirho DESC, s.lemma_id_chirho`
  )
  .all();

console.log(
  `Found ${unrevLemmasChirho.length} polysemous lemmas with 2-9 senses`
);

// Filter out lemmas that already have merge responses
const toProcessChirho = unrevLemmasChirho.filter((lemmaChirho) => {
  const filePathChirho = `${OUTPUT_DIR_CHIRHO}/${lemmaChirho.lemma_id_chirho}-chirho.json`;
  return !existsSync(filePathChirho);
});

console.log(
  `${toProcessChirho.length} need processing (${unrevLemmasChirho.length - toProcessChirho.length} already done)`
);

const limitedChirho =
  LIMIT_CHIRHO > 0 ? toProcessChirho.slice(0, LIMIT_CHIRHO) : toProcessChirho;

let processedChirho = 0;
let totalMergesChirho = 0;
let totalOrigSensesChirho = 0;
let totalResultSensesChirho = 0;

const glossQueryChirho = dbChirho.prepare(
  `SELECT gi.gloss_text_chirho, COUNT(*) as freq_chirho
   FROM sense_assignment_chirho sa
   JOIN gloss_import_chirho gi ON sa.occurrence_id_chirho = gi.word_id_chirho
   WHERE sa.sense_id_chirho = ?1 AND gi.language_code_chirho = ?2
   GROUP BY gi.gloss_text_chirho
   ORDER BY freq_chirho DESC
   LIMIT 3`
);

const senseQueryChirho = dbChirho.prepare(
  `SELECT s.sense_id_chirho,
          COUNT(sa.occurrence_id_chirho) as occ_count_chirho,
          GROUP_CONCAT(DISTINCT substr(w.grammar_chirho, 1, 30)) as grammars_chirho
   FROM sense_chirho s
   JOIN sense_assignment_chirho sa ON s.sense_id_chirho = sa.sense_id_chirho
   JOIN word_chirho w ON sa.occurrence_id_chirho = w.id_chirho
   WHERE s.lemma_id_chirho = ?1
   GROUP BY s.sense_id_chirho
   ORDER BY occ_count_chirho DESC`
);

for (const lemmaChirho of limitedChirho) {
  const lemmaIdChirho = lemmaChirho.lemma_id_chirho;

  // Extract sense clusters
  const rawSensesChirho: any[] = senseQueryChirho.all(lemmaIdChirho);

  const clustersChirho: SenseClusterChirho[] = [];
  for (const sChirho of rawSensesChirho) {
    const glossesChirho: Record<string, string[]> = {};
    for (const langChirho of DIVERSE_LANGS_CHIRHO) {
      const rowsChirho: any[] = glossQueryChirho.all(
        sChirho.sense_id_chirho,
        langChirho
      );
      if (rowsChirho.length > 0) {
        glossesChirho[langChirho] = rowsChirho.map(
          (rChirho: any) => rChirho.gloss_text_chirho
        );
      }
    }
    clustersChirho.push({
      senseIdChirho: sChirho.sense_id_chirho,
      occCountChirho: sChirho.occ_count_chirho,
      grammarsChirho: (sChirho.grammars_chirho || "").substring(0, 80),
      glossesChirho,
    });
  }

  if (clustersChirho.length < 2) continue;

  // Run agglomerative merge
  const mergedGroupsChirho = agglomerativeMergeChirho(
    clustersChirho,
    MERGE_THRESHOLD_CHIRHO
  );

  // Generate labels for each merged group
  const mergeResponseChirho: MergeGroupChirho[] = mergedGroupsChirho.map(
    (groupChirho) => {
      const { labelChirho, descriptionChirho } = generateLabelChirho(
        clustersChirho,
        groupChirho
      );
      return {
        labelChirho,
        descriptionChirho,
        senseIdsChirho: groupChirho,
      };
    }
  );

  // Save the merge response
  const outputPathChirho = `${OUTPUT_DIR_CHIRHO}/${lemmaIdChirho}-chirho.json`;

  if (!DRY_RUN_CHIRHO) {
    writeFileSync(
      outputPathChirho,
      JSON.stringify(mergeResponseChirho, null, 2) + "\n"
    );
  }

  const origCountChirho = clustersChirho.length;
  const resultCountChirho = mergedGroupsChirho.length;
  totalOrigSensesChirho += origCountChirho;
  totalResultSensesChirho += resultCountChirho;

  if (origCountChirho > resultCountChirho) {
    totalMergesChirho++;
  }

  processedChirho++;
  if (processedChirho % 100 === 0) {
    console.log(
      `  Processed ${processedChirho}/${limitedChirho.length} -- ${totalOrigSensesChirho} -> ${totalResultSensesChirho} senses`
    );
  }
}

console.log(`\n=== Auto-Merge Summary ===`);
console.log(`Processed: ${processedChirho} lemmas`);
console.log(
  `Senses: ${totalOrigSensesChirho} -> ${totalResultSensesChirho} (${((1 - totalResultSensesChirho / totalOrigSensesChirho) * 100).toFixed(1)}% reduction)`
);
console.log(`Lemmas with merges: ${totalMergesChirho}`);
console.log(
  `Lemmas unchanged: ${processedChirho - totalMergesChirho}`
);
if (DRY_RUN_CHIRHO) {
  console.log(`(DRY RUN -- no files written)`);
}

dbChirho.close();
