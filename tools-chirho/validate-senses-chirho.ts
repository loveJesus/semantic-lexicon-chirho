// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import { spawnSync } from "child_process";
import { existsSync } from "fs";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";
const CRATES_DIR_CHIRHO = "./crates-chirho";
const MAX_ITERATIONS_CHIRHO = 5;

interface SenseEntropyChirho {
  senseIdChirho: number;
  lemmaIdChirho: string;
  entropyByLangChirho: Record<string, number>;
  avgEntropyChirho: number;
  occurrenceCountChirho: number;
  flagChirho?: string;
}

interface MergeCandidateChirho {
  flagChirho: string;
  senseAChirho: number;
  senseBChirho: number;
  similarityChirho: number;
}

function runEntropyChirho(): {
  splitCandidatesChirho: SenseEntropyChirho[];
  mergeCandidatesChirho: MergeCandidateChirho[];
  totalSensesChirho: number;
  avgEntropyChirho: number;
} {
  // Build entropy binary
  console.log("[validate-senses-chirho] Building entropy-chirho...");
  const buildResultChirho = spawnSync(
    "cargo",
    ["build", "--release", "-p", "entropy-chirho"],
    {
      cwd: CRATES_DIR_CHIRHO,
      stdio: "inherit",
      env: { ...process.env },
    }
  );

  if (buildResultChirho.status !== 0) {
    throw new Error("entropy-chirho build failed");
  }

  const binaryPathChirho = `${CRATES_DIR_CHIRHO}/target/release/entropy-chirho`;
  if (!existsSync(binaryPathChirho)) {
    throw new Error(`Binary not found: ${binaryPathChirho}`);
  }

  console.log("[validate-senses-chirho] Running entropy computation...");
  const runResultChirho = spawnSync(binaryPathChirho, [], {
    stdio: ["inherit", "pipe", "inherit"],
    env: {
      ...process.env,
      SQLITE_PATH_CHIRHO: SQLITE_PATH_CHIRHO,
    },
    maxBuffer: 500 * 1024 * 1024,
  });

  if (runResultChirho.status !== 0) {
    throw new Error("entropy-chirho run failed");
  }

  const stdoutChirho = runResultChirho.stdout?.toString() || "";
  const linesChirho = stdoutChirho
    .split("\n")
    .filter((lineChirho: string) => lineChirho.trim().length > 0);

  const splitCandidatesChirho: SenseEntropyChirho[] = [];
  const mergeCandidatesChirho: MergeCandidateChirho[] = [];
  let totalEntropyChirho = 0;
  let countChirho = 0;

  for (const lineChirho of linesChirho) {
    try {
      const objChirho = JSON.parse(lineChirho);
      if (objChirho.flagChirho === "merge_candidate_chirho") {
        mergeCandidatesChirho.push(objChirho as MergeCandidateChirho);
      } else if (objChirho.flagChirho === "split_candidate_chirho") {
        splitCandidatesChirho.push(objChirho as SenseEntropyChirho);
      }
      if (objChirho.avgEntropyChirho !== undefined) {
        totalEntropyChirho += objChirho.avgEntropyChirho;
        countChirho++;
      }
    } catch {
      // skip invalid lines
    }
  }

  return {
    splitCandidatesChirho,
    mergeCandidatesChirho,
    totalSensesChirho: countChirho,
    avgEntropyChirho: countChirho > 0 ? totalEntropyChirho / countChirho : 0,
  };
}

function mergeSensesChirho(
  dbChirho: Database,
  senseAChirho: number,
  senseBChirho: number
): void {
  // Merge B into A: update all assignments from B to A, then delete B
  dbChirho.run(
    `UPDATE sense_assignment_chirho SET sense_id_chirho = ?1 WHERE sense_id_chirho = ?2`,
    [senseAChirho, senseBChirho]
  );
  dbChirho.run(`DELETE FROM sense_chirho WHERE sense_id_chirho = ?1`, [
    senseBChirho,
  ]);
}

function validateSensesChirho(): void {
  console.log("[validate-senses-chirho] Starting sense validation loop...\n");

  for (
    let iterationChirho = 1;
    iterationChirho <= MAX_ITERATIONS_CHIRHO;
    iterationChirho++
  ) {
    console.log(
      `\n[validate-senses-chirho] === Iteration ${iterationChirho} ===`
    );

    const resultChirho = runEntropyChirho();

    console.log(`  Total senses:        ${resultChirho.totalSensesChirho}`);
    console.log(
      `  Avg entropy:         ${resultChirho.avgEntropyChirho.toFixed(3)}`
    );
    console.log(
      `  Split candidates:    ${resultChirho.splitCandidatesChirho.length}`
    );
    console.log(
      `  Merge candidates:    ${resultChirho.mergeCandidatesChirho.length}`
    );

    // If no candidates, we've converged
    if (
      resultChirho.splitCandidatesChirho.length === 0 &&
      resultChirho.mergeCandidatesChirho.length === 0
    ) {
      console.log(
        "\n[validate-senses-chirho] Converged! No more split/merge candidates."
      );
      break;
    }

    const dbChirho = new Database(SQLITE_PATH_CHIRHO);
    dbChirho.run("PRAGMA journal_mode=WAL");
    dbChirho.run("PRAGMA synchronous=NORMAL");

    // Process merge candidates first (simpler operation)
    let mergesChirho = 0;
    if (resultChirho.mergeCandidatesChirho.length > 0) {
      dbChirho.run("BEGIN");
      for (const mcChirho of resultChirho.mergeCandidatesChirho) {
        // Verify both senses still exist before merging
        const existsAChirho: any = dbChirho
          .query(
            "SELECT COUNT(*) as cnt_chirho FROM sense_chirho WHERE sense_id_chirho = ?1"
          )
          .get(mcChirho.senseAChirho);
        const existsBChirho: any = dbChirho
          .query(
            "SELECT COUNT(*) as cnt_chirho FROM sense_chirho WHERE sense_id_chirho = ?1"
          )
          .get(mcChirho.senseBChirho);

        if (existsAChirho.cnt_chirho > 0 && existsBChirho.cnt_chirho > 0) {
          mergeSensesChirho(
            dbChirho,
            mcChirho.senseAChirho,
            mcChirho.senseBChirho
          );
          mergesChirho++;
        }
      }
      dbChirho.run("COMMIT");
      console.log(`  Merges performed:    ${mergesChirho}`);
    }

    // For split candidates, we skip re-clustering (would need to re-run cluster-chirho
    // with different params for specific lemmas — complex). Instead, just log them
    // for human review in the review queue.
    if (resultChirho.splitCandidatesChirho.length > 0) {
      dbChirho.run("BEGIN");
      const insertQueueChirho = dbChirho.prepare(
        `INSERT OR REPLACE INTO review_queue_chirho
         (lemma_id_chirho, uncertainty_score_chirho, reason_chirho, reviewed_chirho)
         VALUES (?1, ?2, ?3, 0)`
      );
      for (const scChirho of resultChirho.splitCandidatesChirho) {
        insertQueueChirho.run(
          scChirho.lemmaIdChirho,
          scChirho.avgEntropyChirho,
          "split_candidate: high entropy in 3+ languages"
        );
      }
      dbChirho.run("COMMIT");
      console.log(
        `  Split candidates queued for review: ${resultChirho.splitCandidatesChirho.length}`
      );
    }

    dbChirho.close();
  }

  // Final stats
  const dbChirho = new Database(SQLITE_PATH_CHIRHO);
  const senseCountChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM sense_chirho")
    .get();
  const assignmentCountChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM sense_assignment_chirho")
    .get();
  const queueCountChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM review_queue_chirho")
    .get();

  console.log("\n[validate-senses-chirho] === FINAL STATE ===");
  console.log(`  Total senses:        ${senseCountChirho.cnt_chirho}`);
  console.log(`  Total assignments:   ${assignmentCountChirho.cnt_chirho}`);
  console.log(`  Review queue items:  ${queueCountChirho.cnt_chirho}`);

  dbChirho.close();
  console.log("[validate-senses-chirho] Done.");
}

validateSensesChirho();
