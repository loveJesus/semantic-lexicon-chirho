// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import { readFileSync, writeFileSync, mkdirSync } from "fs";

const SEM_DB_PATH_CHIRHO = "./data-chirho/semantic-chirho.db";
const PROPOSALS_PATH_CHIRHO = "./output-chirho/refinement-chirho/all-split-proposals-chirho.json";
const PROMPTS_DIR_CHIRHO = "./output-chirho/refinement-chirho/reassign-prompts-chirho";
const MAX_OCC_PER_PROMPT_CHIRHO = 120;

const BOOK_NAMES_CHIRHO: Record<number, string> = {
  1: "Gen", 2: "Exod", 3: "Lev", 4: "Num", 5: "Deut",
  6: "Josh", 7: "Judg", 8: "Ruth", 9: "1Sam", 10: "2Sam",
  11: "1Kgs", 12: "2Kgs", 13: "1Chr", 14: "2Chr", 15: "Ezra",
  16: "Neh", 17: "Esth", 18: "Job", 19: "Ps", 20: "Prov",
  21: "Eccl", 22: "Song", 23: "Isa", 24: "Jer", 25: "Lam",
  26: "Ezek", 27: "Dan", 28: "Hos", 29: "Joel", 30: "Amos",
  31: "Obad", 32: "Jonah", 33: "Mic", 34: "Nah", 35: "Hab",
  36: "Zeph", 37: "Hag", 38: "Zech", 39: "Mal",
  40: "Matt", 41: "Mark", 42: "Luke", 43: "John", 44: "Acts",
  45: "Rom", 46: "1Cor", 47: "2Cor", 48: "Gal", 49: "Eph",
  50: "Phil", 51: "Col", 52: "1Thess", 53: "2Thess",
  54: "1Tim", 55: "2Tim", 56: "Titus", 57: "Phlm", 58: "Heb",
  59: "Jas", 60: "1Pet", 61: "2Pet", 62: "1John", 63: "2John",
  64: "3John", 65: "Jude", 66: "Rev",
};

function parseWordIdChirho(widChirho: string): { bookChirho: number; chapChirho: number; verseChirho: number; posChirho: number } {
  return {
    bookChirho: parseInt(widChirho.substring(0, 2)),
    chapChirho: parseInt(widChirho.substring(2, 5)),
    verseChirho: parseInt(widChirho.substring(5, 8)),
    posChirho: parseInt(widChirho.substring(8)),
  };
}

function formatRefChirho(widChirho: string): string {
  const pChirho = parseWordIdChirho(widChirho);
  const nameChirho = BOOK_NAMES_CHIRHO[pChirho.bookChirho] || `Bk${pChirho.bookChirho}`;
  return `${nameChirho} ${pChirho.chapChirho}:${pChirho.verseChirho}`;
}

interface ProposalChirho {
  senseIdChirho: number;
  lemmaIdChirho: string;
  currentLabelChirho: string;
  splitProposalChirho: { newLabelChirho: string; criteriaChirho: string }[];
  confidenceChirho: string;
  reasoningChirho: string;
}

function mainChirho(): void {
  mkdirSync(PROMPTS_DIR_CHIRHO, { recursive: true });

  const proposalsChirho: ProposalChirho[] = JSON.parse(
    readFileSync(PROPOSALS_PATH_CHIRHO, "utf-8"),
  );

  // Filter to high + medium confidence with actual split proposals
  const actionableChirho = proposalsChirho.filter(
    (pChirho) =>
      (pChirho.confidenceChirho === "high" || pChirho.confidenceChirho === "HIGH" ||
       pChirho.confidenceChirho === "medium" || pChirho.confidenceChirho === "Medium") &&
      pChirho.splitProposalChirho &&
      pChirho.splitProposalChirho.length >= 2,
  );

  console.log(`[gen-reassign] ${actionableChirho.length} actionable proposals (high+medium)`);

  const dbChirho = new Database(SEM_DB_PATH_CHIRHO, { readonly: true });
  dbChirho.run("PRAGMA cache_size=-64000");

  // Prepared statements
  const occStmtChirho = dbChirho.prepare(
    `SELECT occurrence_id_chirho FROM sense_assignment_chirho
     WHERE sense_id_chirho = ?1
     ORDER BY occurrence_id_chirho`,
  );

  const glossStmtChirho = dbChirho.prepare(
    `SELECT language_code_chirho,
            (SELECT token_chirho FROM dictionary_chirho WHERE encoded_id_chirho = gp.phrase_id_chirho AND type_chirho = 'phrase') as phrase_chirho
     FROM gloss_phrase_chirho gp
     WHERE gp.occurrence_id_chirho = ?1
       AND gp.language_code_chirho IN ('eng', 'spa', 'kor', 'arb')
     ORDER BY gp.language_code_chirho`,
  );

  let promptIdxChirho = 0;
  const manifestChirho: {
    promptFileChirho: string;
    senseIdChirho: number;
    lemmaIdChirho: string;
    batchIdxChirho: number;
    occCountChirho: number;
  }[] = [];

  for (const propChirho of actionableChirho) {
    const senseIdChirho = propChirho.senseIdChirho;
    const lemmaIdChirho = propChirho.lemmaIdChirho;

    // Get all occurrences
    const occsChirho = occStmtChirho.all(senseIdChirho) as { occurrence_id_chirho: string }[];
    console.log(
      `[gen-reassign] ${lemmaIdChirho} sense ${senseIdChirho}: ${occsChirho.length} occurrences`,
    );

    if (occsChirho.length === 0) continue;

    // Build occurrence data with glosses
    const occDataChirho: { widChirho: string; refChirho: string; glossesChirho: string }[] = [];
    for (const occChirho of occsChirho) {
      const widChirho = String(occChirho.occurrence_id_chirho);
      const refChirho = formatRefChirho(widChirho);
      const glossRowsChirho = glossStmtChirho.all(widChirho) as { language_code_chirho: string; phrase_chirho: string }[];
      const glossPartsChirho: string[] = [];
      for (const gChirho of glossRowsChirho) {
        if (gChirho.phrase_chirho) {
          glossPartsChirho.push(`${gChirho.language_code_chirho}:${gChirho.phrase_chirho}`);
        }
      }
      occDataChirho.push({
        widChirho,
        refChirho,
        glossesChirho: glossPartsChirho.join(" | "),
      });
    }

    // Batch into prompts
    for (let iChirho = 0; iChirho < occDataChirho.length; iChirho += MAX_OCC_PER_PROMPT_CHIRHO) {
      const batchChirho = occDataChirho.slice(iChirho, iChirho + MAX_OCC_PER_PROMPT_CHIRHO);
      const batchNumChirho = Math.floor(iChirho / MAX_OCC_PER_PROMPT_CHIRHO);

      // Build sub-sense options
      let optionsTextChirho = "";
      for (let sChirho = 0; sChirho < propChirho.splitProposalChirho.length; sChirho++) {
        const subChirho = propChirho.splitProposalChirho[sChirho];
        optionsTextChirho += `  ${sChirho + 1}. **${subChirho.newLabelChirho}**: ${subChirho.criteriaChirho}\n`;
      }

      let promptChirho = `# Sense Reassignment: ${lemmaIdChirho} (sense ${senseIdChirho})

## Current sense label
"${propChirho.currentLabelChirho}"

## Proposed sub-senses
${optionsTextChirho}
## Task
For each occurrence below, assign it to exactly ONE sub-sense number (1, 2, etc.) based on the verse reference and translation glosses.

## Output Format
Return a JSON object mapping word IDs to sub-sense numbers:
\`\`\`json
{
  "assignmentsChirho": {
    "0100100101": 1,
    "0100100203": 2
  }
}
\`\`\`

## Occurrences (${batchChirho.length} items, batch ${batchNumChirho + 1})

`;
      for (const occChirho of batchChirho) {
        promptChirho += `${occChirho.widChirho}  ${occChirho.refChirho}  ${occChirho.glossesChirho}\n`;
      }

      const fileNameChirho = `prompt-${String(promptIdxChirho).padStart(4, "0")}-${lemmaIdChirho}-b${batchNumChirho}.txt`;
      writeFileSync(`${PROMPTS_DIR_CHIRHO}/${fileNameChirho}`, promptChirho);

      manifestChirho.push({
        promptFileChirho: fileNameChirho,
        senseIdChirho,
        lemmaIdChirho,
        batchIdxChirho: batchNumChirho,
        occCountChirho: batchChirho.length,
      });

      promptIdxChirho++;
    }
  }

  dbChirho.close();

  // Write manifest
  writeFileSync(
    `${PROMPTS_DIR_CHIRHO}/manifest-chirho.json`,
    JSON.stringify(manifestChirho, null, 2),
  );

  console.log(`\n[gen-reassign] Generated ${promptIdxChirho} reassignment prompts`);
  console.log(`[gen-reassign] Total occurrences to classify: ${manifestChirho.reduce((sChirho, mChirho) => sChirho + mChirho.occCountChirho, 0)}`);
  console.log(`[gen-reassign] Manifest: ${PROMPTS_DIR_CHIRHO}/manifest-chirho.json`);
}

mainChirho();
