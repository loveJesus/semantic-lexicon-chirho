// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life. John 3:16

/**
 * apply-reassignments-chirho.ts
 *
 * Reads the split proposals and reassignment responses, then:
 * 1. Creates new sub-sense rows in sense_chirho for each split
 * 2. Reassigns occurrences in sense_assignment_chirho to the new sub-sense IDs
 * 3. Optionally retires the original parent sense (marks label with [split])
 */

import { Database } from "bun:sqlite";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const BASE_CHIRHO = import.meta.dir + "/..";
const DB_PATH_CHIRHO = join(BASE_CHIRHO, "data-chirho/semantic-chirho.db");
const PROPOSALS_PATH_CHIRHO = join(BASE_CHIRHO, "output-chirho/refinement-chirho/all-split-proposals-chirho.json");
const MANIFEST_PATH_CHIRHO = join(BASE_CHIRHO, "output-chirho/refinement-chirho/reassign-prompts-chirho/manifest-chirho.json");
const RESPONSES_DIR_CHIRHO = join(BASE_CHIRHO, "output-chirho/refinement-chirho/reassign-responses-chirho");

interface SplitProposalChirho {
  senseIdChirho: number;
  lemmaIdChirho: string;
  currentLabelChirho: string;
  splitProposalChirho: { newLabelChirho: string; criteriaChirho: string }[];
  confidenceChirho: string;
  reasoningChirho: string;
}

interface ManifestEntryChirho {
  promptFileChirho: string;
  senseIdChirho: number;
  lemmaIdChirho: string;
  batchIdxChirho: number;
  occCountChirho: number;
}

interface ResponseChirho {
  assignmentsChirho: Record<string, number>;
}

function mainChirho() {
  const dryRunChirho = process.argv.includes("--dry-run");

  // Load data
  const proposalsChirho: SplitProposalChirho[] = JSON.parse(readFileSync(PROPOSALS_PATH_CHIRHO, "utf-8"));
  const manifestChirho: ManifestEntryChirho[] = JSON.parse(readFileSync(MANIFEST_PATH_CHIRHO, "utf-8"));

  // Group manifest entries by senseId
  const manifestBySenseChirho = new Map<number, ManifestEntryChirho[]>();
  for (const entryChirho of manifestChirho) {
    const listChirho = manifestBySenseChirho.get(entryChirho.senseIdChirho) || [];
    listChirho.push(entryChirho);
    manifestBySenseChirho.set(entryChirho.senseIdChirho, listChirho);
  }

  // Load all response files
  const responseFilesChirho = readdirSync(RESPONSES_DIR_CHIRHO).filter((fChirho) => fChirho.endsWith(".json"));
  const responsesByFileChirho = new Map<string, ResponseChirho>();
  for (const fnChirho of responseFilesChirho) {
    const dataChirho = JSON.parse(readFileSync(join(RESPONSES_DIR_CHIRHO, fnChirho), "utf-8"));
    responsesByFileChirho.set(fnChirho, dataChirho);
  }

  // Open DB
  const dbChirho = new Database(DB_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");

  // Stats
  let sensesCreatedChirho = 0;
  let occurrencesReassignedChirho = 0;
  let parentSensesRetiredChirho = 0;
  let errorsChirho = 0;

  // Process each proposal
  const txChirho = dbChirho.transaction(() => {
    for (const proposalChirho of proposalsChirho) {
      const senseIdChirho = proposalChirho.senseIdChirho;
      const lemmaIdChirho = proposalChirho.lemmaIdChirho;
      const subSensesChirho = proposalChirho.splitProposalChirho;

      // Get manifest entries for this sense
      const entriesChirho = manifestBySenseChirho.get(senseIdChirho);
      if (!entriesChirho || entriesChirho.length === 0) {
        console.warn(`[SKIP] No manifest entries for sense ${senseIdChirho} (${lemmaIdChirho})`);
        continue;
      }

      // Collect all assignments for this sense across all batches
      const allAssignmentsChirho = new Map<string, number>();
      for (const entryChirho of entriesChirho) {
        // prompt file name like "prompt-0000-G0040-b0.txt" -> response "prompt-0000.json"
        const promptNumChirho = entryChirho.promptFileChirho.match(/prompt-(\d+)/)?.[1];
        if (!promptNumChirho) continue;
        const responseFileChirho = `prompt-${promptNumChirho}.json`;
        const responseChirho = responsesByFileChirho.get(responseFileChirho);
        if (!responseChirho) {
          console.warn(`[WARN] Missing response ${responseFileChirho} for sense ${senseIdChirho}`);
          errorsChirho++;
          continue;
        }
        for (const [wordIdChirho, subSenseNumChirho] of Object.entries(responseChirho.assignmentsChirho)) {
          allAssignmentsChirho.set(wordIdChirho, subSenseNumChirho);
        }
      }

      if (allAssignmentsChirho.size === 0) {
        console.warn(`[SKIP] No assignments collected for sense ${senseIdChirho}`);
        continue;
      }

      // Create new sub-sense rows
      const subSenseIdsChirho = new Map<number, number>(); // subSenseNumber -> new sense_id
      for (let iChirho = 0; iChirho < subSensesChirho.length; iChirho++) {
        const subChirho = subSensesChirho[iChirho];
        const subNumChirho = iChirho + 1; // 1-indexed

        if (dryRunChirho) {
          console.log(`  [DRY] Would create sub-sense ${subNumChirho}: "${subChirho.newLabelChirho}" for ${lemmaIdChirho}`);
          subSenseIdsChirho.set(subNumChirho, -subNumChirho); // placeholder
        } else {
          const resultChirho = dbChirho.run(
            `INSERT INTO sense_chirho (lemma_id_chirho, label_chirho, description_chirho, cluster_method_chirho)
             VALUES (?, ?, ?, ?)`,
            [
              lemmaIdChirho,
              subChirho.newLabelChirho,
              `Split from sense ${senseIdChirho}. Criteria: ${subChirho.criteriaChirho}`,
              "refinement-split",
            ]
          );
          const newIdChirho = Number(resultChirho.lastInsertRowid);
          subSenseIdsChirho.set(subNumChirho, newIdChirho);
          sensesCreatedChirho++;
        }
      }

      // Reassign occurrences
      let reassignedThisSenseChirho = 0;
      for (const [wordIdChirho, subSenseNumChirho] of allAssignmentsChirho) {
        const newSenseIdChirho = subSenseIdsChirho.get(subSenseNumChirho);
        if (!newSenseIdChirho) {
          // Sub-sense number out of range - assign to max valid
          const maxSubChirho = subSensesChirho.length;
          const fallbackChirho = subSenseIdsChirho.get(Math.min(subSenseNumChirho, maxSubChirho));
          if (!fallbackChirho) {
            console.warn(`[ERR] Invalid sub-sense ${subSenseNumChirho} for word ${wordIdChirho} in sense ${senseIdChirho}`);
            errorsChirho++;
            continue;
          }
          if (!dryRunChirho) {
            dbChirho.run(
              `UPDATE sense_assignment_chirho SET sense_id_chirho = ?, source_chirho = 'refinement-split'
               WHERE occurrence_id_chirho = ?`,
              [fallbackChirho, wordIdChirho]
            );
          }
          reassignedThisSenseChirho++;
          occurrencesReassignedChirho++;
          continue;
        }

        if (!dryRunChirho) {
          dbChirho.run(
            `UPDATE sense_assignment_chirho SET sense_id_chirho = ?, source_chirho = 'refinement-split'
             WHERE occurrence_id_chirho = ?`,
            [newSenseIdChirho, wordIdChirho]
          );
        }
        reassignedThisSenseChirho++;
        occurrencesReassignedChirho++;
      }

      // Retire the parent sense label
      if (!dryRunChirho) {
        dbChirho.run(
          `UPDATE sense_chirho SET label_chirho = '[split] ' || COALESCE(label_chirho, ''),
           description_chirho = 'Split into ' || ? || ' sub-senses. ' || COALESCE(description_chirho, ''),
           updated_at_chirho = datetime('now')
           WHERE sense_id_chirho = ?`,
          [subSensesChirho.length, senseIdChirho]
        );
        parentSensesRetiredChirho++;
      }

      console.log(
        `[OK] ${lemmaIdChirho} sense ${senseIdChirho}: ${reassignedThisSenseChirho} occurrences -> ${subSensesChirho.length} sub-senses`
      );
    }
  });

  txChirho();
  dbChirho.close();

  console.log("\n=== SUMMARY ===");
  console.log(`Proposals processed: ${proposalsChirho.length}`);
  console.log(`New sub-senses created: ${sensesCreatedChirho}`);
  console.log(`Occurrences reassigned: ${occurrencesReassignedChirho}`);
  console.log(`Parent senses retired: ${parentSensesRetiredChirho}`);
  console.log(`Errors: ${errorsChirho}`);
  if (dryRunChirho) {
    console.log("\n(DRY RUN - no changes written)");
  }
}

mainChirho();
