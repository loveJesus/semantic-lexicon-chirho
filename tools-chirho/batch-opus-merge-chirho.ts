// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

/**
 * Batch LLM merge for lemmas with 2-9 senses using Opus subagents.
 * Generates prompts, sends to Claude Code Task subagents (Opus),
 * and writes merge response JSON files.
 *
 * Usage:
 *   bun run tools-chirho/batch-opus-merge-chirho.ts [--start N] [--limit N] [--concurrency N]
 *
 * This script outputs a list of lemma IDs and their prompts,
 * then the calling agent dispatches them to Opus subagents.
 */

import { Database } from "bun:sqlite";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";
const RESPONSE_DIR_CHIRHO = "./output-chirho/merge-responses-chirho";

const argsChirho = process.argv.slice(2);
const startIdxChirho = parseInt(
  argsChirho[argsChirho.indexOf("--start") + 1] || "0"
);
const limitChirho = parseInt(
  argsChirho[argsChirho.indexOf("--limit") + 1] || "4107"
);
const modeChirho = argsChirho.includes("--list") ? "list" : "prompt";
const singleChirho = argsChirho.includes("--single")
  ? argsChirho[argsChirho.indexOf("--single") + 1]
  : null;

const dbChirho = new Database(SQLITE_PATH_CHIRHO, { readonly: true });

const DIVERSE_LANGS_CHIRHO = ["eng", "spa", "hin", "arb", "kor", "swa"];

interface SenseDataChirho {
  senseIdChirho: number;
  occCountChirho: number;
  grammarsChirho: string;
  glossesChirho: Record<string, string[]>;
}

function generatePromptChirho(lemmaIdChirho: string): string | null {
  const lemmaChirho: any = dbChirho
    .query(
      "SELECT id_chirho, pos_chirho, substr(gloss_chirho, 1, 100) as gloss_chirho FROM lemma_chirho WHERE id_chirho = ?1"
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

  let promptChirho = `# Sense Merge Task for ${lemmaIdChirho}

Lemma: ${lemmaIdChirho} (POS: ${lemmaChirho.pos_chirho || "?"}, Gloss: "${lemmaChirho.gloss_chirho || "?"}")
Total occurrences: ${totalOccChirho}
Current sense count: ${sensesChirho.length}

This lemma has been over-split into ${sensesChirho.length} sense clusters by an automated algorithm. The algorithm fragmented by grammatical inflection when it should only split by MEANING.

## Current Sense Clusters

`;

  for (const sChirho of sensesChirho) {
    promptChirho += `### Sense ${sChirho.sense_id_chirho} (${sChirho.occ_count_chirho} occurrences)\n`;
    promptChirho += `Grammar: ${(sChirho.grammars_chirho || "").substring(0, 80)}\n`;

    for (const langChirho of DIVERSE_LANGS_CHIRHO) {
      const rowsChirho: any[] = dbChirho
        .query(
          `SELECT gi.gloss_text_chirho, COUNT(*) as freq_chirho
           FROM sense_assignment_chirho sa
           JOIN gloss_import_chirho gi ON sa.occurrence_id_chirho = gi.word_id_chirho
           WHERE sa.sense_id_chirho = ?1 AND gi.language_code_chirho = ?2
           GROUP BY gi.gloss_text_chirho
           ORDER BY freq_chirho DESC
           LIMIT 3`
        )
        .all(sChirho.sense_id_chirho, langChirho);

      if (rowsChirho.length > 0) {
        promptChirho += `  ${langChirho}: ${rowsChirho.map((rChirho: any) => rChirho.gloss_text_chirho).join(", ")}\n`;
      }
    }
    promptChirho += "\n";
  }

  promptChirho += `## Task

Group these ${sensesChirho.length} sense clusters into the REAL lexicographic senses of this word. Different grammatical inflections of the same meaning (e.g., "returned" vs "return" vs "will return") are the SAME sense. Different verb stems (Qal vs Hifil vs Piel) often ARE different senses. Literal vs metaphorical uses ARE different senses.

Respond with ONLY a JSON array where each element is a merged sense:
[
  {
    "labelChirho": "short sense label (2-5 words)",
    "descriptionChirho": "one sentence description",
    "senseIdsChirho": [list of sense_id numbers to merge into this sense]
  }
]

IMPORTANT: Every sense ID from the input MUST appear in exactly one group. Return ONLY the JSON array, no other text.`;

  return promptChirho;
}

if (singleChirho) {
  const promptChirho = generatePromptChirho(singleChirho);
  if (promptChirho) {
    console.log(promptChirho);
  } else {
    console.error(`No data for ${singleChirho}`);
    process.exit(1);
  }
} else if (modeChirho === "list") {
  // Output list of lemma IDs that need processing
  const lemmasChirho: any[] = dbChirho
    .query(
      `SELECT lemma_id_chirho, COUNT(*) as sc
       FROM sense_chirho
       GROUP BY lemma_id_chirho
       HAVING sc BETWEEN 2 AND 9
       ORDER BY sc DESC, lemma_id_chirho`
    )
    .all();

  const sliceChirho = lemmasChirho.slice(
    startIdxChirho,
    startIdxChirho + limitChirho
  );
  for (const lChirho of sliceChirho) {
    console.log(`${lChirho.lemma_id_chirho}|${lChirho.sc}`);
  }
  console.error(`Total: ${sliceChirho.length} lemmas`);
} else {
  // Output prompts as JSON lines for piping to agents
  const lemmasChirho: any[] = dbChirho
    .query(
      `SELECT lemma_id_chirho, COUNT(*) as sc
       FROM sense_chirho
       GROUP BY lemma_id_chirho
       HAVING sc BETWEEN 2 AND 9
       ORDER BY sc DESC, lemma_id_chirho`
    )
    .all();

  const sliceChirho = lemmasChirho.slice(
    startIdxChirho,
    startIdxChirho + limitChirho
  );

  for (const lChirho of sliceChirho) {
    const promptChirho = generatePromptChirho(lChirho.lemma_id_chirho);
    if (promptChirho) {
      console.log(
        JSON.stringify({
          lemmaIdChirho: lChirho.lemma_id_chirho,
          senseCountChirho: lChirho.sc,
          promptChirho,
        })
      );
    }
  }
}

dbChirho.close();
