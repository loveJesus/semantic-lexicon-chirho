// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";
const MIN_SENSES_CHIRHO = 10;
const DIVERSE_LANGS_CHIRHO = ["eng", "spa", "hin", "arb", "kor", "swa"];

interface SenseSummaryChirho {
  senseIdChirho: number;
  occCountChirho: number;
  grammarsChirho: string;
  glossesChirho: Record<string, string[]>;
}

interface LemmaSummaryChirho {
  lemmaIdChirho: string;
  glossChirho: string;
  posChirho: string;
  totalOccurrencesChirho: number;
  sensesChirho: SenseSummaryChirho[];
}

/** Extract a compact summary of all senses for a lemma. */
function extractLemmaSummaryChirho(
  dbChirho: Database,
  lemmaIdChirho: string
): LemmaSummaryChirho | null {
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

  const totalOccChirho = sensesChirho.reduce(
    (sumChirho: number, sChirho: any) => sumChirho + sChirho.occ_count_chirho,
    0
  );

  const senseSummariesChirho: SenseSummaryChirho[] = [];

  for (const sChirho of sensesChirho) {
    const glossesChirho: Record<string, string[]> = {};

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
        glossesChirho[langChirho] = rowsChirho.map(
          (rChirho: any) => rChirho.gloss_text_chirho
        );
      }
    }

    senseSummariesChirho.push({
      senseIdChirho: sChirho.sense_id_chirho,
      occCountChirho: sChirho.occ_count_chirho,
      grammarsChirho: (sChirho.grammars_chirho || "").substring(0, 80),
      glossesChirho,
    });
  }

  return {
    lemmaIdChirho,
    glossChirho: lemmaChirho.gloss_chirho || "",
    posChirho: lemmaChirho.pos_chirho || "",
    totalOccurrencesChirho: totalOccChirho,
    sensesChirho: senseSummariesChirho,
  };
}

/** Format a lemma summary into a prompt for the LLM. */
function formatPromptChirho(summaryChirho: LemmaSummaryChirho): string {
  let promptChirho = `# Sense Merge Task for ${summaryChirho.lemmaIdChirho}

Lemma: ${summaryChirho.lemmaIdChirho} (POS: ${summaryChirho.posChirho})
Total occurrences: ${summaryChirho.totalOccurrencesChirho}
Current sense count: ${summaryChirho.sensesChirho.length}

This Hebrew/Greek lemma has been over-split into ${summaryChirho.sensesChirho.length} sense clusters by an automated algorithm. The algorithm fragmented by grammatical inflection (person, number, gender, prepositional prefix) when it should only split by MEANING.

For each sense cluster below, I show: occurrence count, grammar tags, and top glosses in English/Spanish/Hindi.

## Current Sense Clusters

`;

  for (const sChirho of summaryChirho.sensesChirho) {
    promptChirho += `### Sense ${sChirho.senseIdChirho} (${sChirho.occCountChirho} occurrences)\n`;
    promptChirho += `Grammar: ${sChirho.grammarsChirho}\n`;
    for (const [langChirho, glossesChirho] of Object.entries(
      sChirho.glossesChirho
    )) {
      promptChirho += `  ${langChirho}: ${glossesChirho.join(", ")}\n`;
    }
    promptChirho += "\n";
  }

  promptChirho += `## Task

Group these ${summaryChirho.sensesChirho.length} sense clusters into the REAL senses of this word. Typical Hebrew/Greek words have 2-8 genuine senses. Different grammatical inflections of the same meaning (e.g., "returned" vs "return" vs "will return") are the SAME sense. Different verb stems (Qal vs Hifil vs Piel) often ARE different senses.

Respond with a JSON array where each element is a merged sense:
\`\`\`json
[
  {
    "labelChirho": "short sense label (2-5 words)",
    "descriptionChirho": "one sentence description",
    "senseIdsChirho": [list of sense_id numbers to merge into this sense]
  }
]
\`\`\`

IMPORTANT: Every sense ID from the input must appear in exactly one group. Return ONLY the JSON array, no other text.`;

  return promptChirho;
}

/** Parse the LLM response to extract merge groups. */
function parseMergeResponseChirho(
  responseChirho: string
): Array<{
  labelChirho: string;
  descriptionChirho: string;
  senseIdsChirho: number[];
}> | null {
  try {
    // Extract JSON from response (may be wrapped in markdown code block)
    const jsonMatchChirho = responseChirho.match(/\[[\s\S]*\]/);
    if (!jsonMatchChirho) return null;
    const parsedChirho = JSON.parse(jsonMatchChirho[0]);
    if (!Array.isArray(parsedChirho)) return null;
    return parsedChirho;
  } catch {
    return null;
  }
}

/** Apply merge decisions to the database. */
function applyMergesChirho(
  dbChirho: Database,
  mergeGroupsChirho: Array<{
    labelChirho: string;
    descriptionChirho: string;
    senseIdsChirho: number[];
  }>
): { mergedChirho: number; remainingChirho: number } {
  let mergedChirho = 0;
  let remainingChirho = 0;

  for (const groupChirho of mergeGroupsChirho) {
    if (groupChirho.senseIdsChirho.length <= 1) {
      remainingChirho++;
      continue;
    }

    // Keep the first sense ID as the target, merge others into it
    const targetIdChirho = groupChirho.senseIdsChirho[0];
    const sourceIdsChirho = groupChirho.senseIdsChirho.slice(1);

    // Update label on target
    dbChirho
      .query(
        `UPDATE sense_chirho
         SET label_chirho = ?1,
             description_chirho = ?2,
             cluster_method_chirho = COALESCE(cluster_method_chirho, '') || '+llm_merge'
         WHERE sense_id_chirho = ?3`
      )
      .run(groupChirho.labelChirho, groupChirho.descriptionChirho, targetIdChirho);

    // Merge all source senses into target
    for (const sourceIdChirho of sourceIdsChirho) {
      // Verify source still exists
      const existsChirho: any = dbChirho
        .query(
          "SELECT COUNT(*) as cnt_chirho FROM sense_chirho WHERE sense_id_chirho = ?1"
        )
        .get(sourceIdChirho);

      if (existsChirho.cnt_chirho > 0) {
        dbChirho
          .query(
            "UPDATE sense_assignment_chirho SET sense_id_chirho = ?1 WHERE sense_id_chirho = ?2"
          )
          .run(targetIdChirho, sourceIdChirho);
        dbChirho
          .query("DELETE FROM sense_chirho WHERE sense_id_chirho = ?1")
          .run(sourceIdChirho);
        mergedChirho++;
      }
    }
    remainingChirho++;
  }

  return { mergedChirho, remainingChirho };
}

// Export functions for use by the orchestrator
export {
  extractLemmaSummaryChirho,
  formatPromptChirho,
  parseMergeResponseChirho,
  applyMergesChirho,
  MIN_SENSES_CHIRHO,
};
export type { LemmaSummaryChirho };
