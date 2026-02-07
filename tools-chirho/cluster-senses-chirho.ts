// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import { spawnSync } from "child_process";
import { existsSync } from "fs";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";
const CRATES_DIR_CHIRHO = "./crates-chirho";

interface SenseClusterChirho {
  senseIndexChirho: number;
  occurrenceIdsChirho: string[];
  methodChirho: string;
}

interface LemmaResultChirho {
  lemmaIdChirho: string;
  sensesChirho: SenseClusterChirho[];
}

function clusterSensesChirho(): void {
  // Build Rust binary in release mode
  console.log("[cluster-senses-chirho] Building Rust binary...");
  const buildResultChirho = spawnSync(
    "cargo",
    ["build", "--release", "-p", "cluster-chirho"],
    {
      cwd: CRATES_DIR_CHIRHO,
      stdio: "inherit",
      env: { ...process.env },
    }
  );

  if (buildResultChirho.status !== 0) {
    console.error("[cluster-senses-chirho] Build failed!");
    process.exit(1);
  }

  const binaryPathChirho = `${CRATES_DIR_CHIRHO}/target/release/cluster-chirho`;
  if (!existsSync(binaryPathChirho)) {
    console.error(
      `[cluster-senses-chirho] Binary not found: ${binaryPathChirho}`
    );
    process.exit(1);
  }

  // Run the binary, capturing stdout (JSON lines) while passing stderr through
  console.log("[cluster-senses-chirho] Running clustering...");
  const runResultChirho = spawnSync(binaryPathChirho, [], {
    stdio: ["inherit", "pipe", "inherit"],
    env: {
      ...process.env,
      SQLITE_PATH_CHIRHO: SQLITE_PATH_CHIRHO,
    },
    maxBuffer: 500 * 1024 * 1024, // 500MB buffer for large output
  });

  if (runResultChirho.status !== 0) {
    console.error("[cluster-senses-chirho] Clustering failed!");
    process.exit(1);
  }

  const stdoutChirho = runResultChirho.stdout?.toString() || "";
  const linesChirho = stdoutChirho
    .split("\n")
    .filter((lineChirho: string) => lineChirho.trim().length > 0);

  console.log(
    `[cluster-senses-chirho] Received ${linesChirho.length} lemma results`
  );

  // Clear existing sense data before inserting
  const dbChirho = new Database(SQLITE_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");
  dbChirho.run("PRAGMA synchronous=NORMAL");

  dbChirho.run("DELETE FROM sense_assignment_chirho");
  dbChirho.run("DELETE FROM sense_chirho");

  const insertSenseChirho = dbChirho.prepare(
    `INSERT INTO sense_chirho (lemma_id_chirho, cluster_method_chirho) VALUES (?1, ?2)`
  );
  const insertAssignmentChirho = dbChirho.prepare(
    `INSERT INTO sense_assignment_chirho (occurrence_id_chirho, sense_id_chirho, confidence_chirho, source_chirho) VALUES (?1, ?2, ?3, ?4)`
  );

  let totalSensesChirho = 0;
  let totalAssignmentsChirho = 0;
  let singleSenseCountChirho = 0;
  let multiSenseCountChirho = 0;
  let parsedChirho = 0;

  // Process in batches using transactions
  const BATCH_SIZE_CHIRHO = 1000;
  let batchCountChirho = 0;

  dbChirho.run("BEGIN");

  for (const lineChirho of linesChirho) {
    try {
      const resultChirho: LemmaResultChirho = JSON.parse(lineChirho);

      if (resultChirho.sensesChirho.length === 1) {
        singleSenseCountChirho++;
      } else {
        multiSenseCountChirho++;
      }

      for (const senseChirho of resultChirho.sensesChirho) {
        // Insert sense row
        insertSenseChirho.run(
          resultChirho.lemmaIdChirho,
          senseChirho.methodChirho
        );
        const senseIdChirho = dbChirho
          .query("SELECT last_insert_rowid() as id_chirho")
          .get() as any;
        const idChirho = senseIdChirho.id_chirho;
        totalSensesChirho++;

        // Insert assignments for each occurrence in this sense
        for (const occIdChirho of senseChirho.occurrenceIdsChirho) {
          insertAssignmentChirho.run(occIdChirho, idChirho, 1.0, "auto");
          totalAssignmentsChirho++;
        }
      }

      parsedChirho++;
      batchCountChirho++;

      if (batchCountChirho >= BATCH_SIZE_CHIRHO) {
        dbChirho.run("COMMIT");
        dbChirho.run("BEGIN");
        batchCountChirho = 0;
      }

      if (parsedChirho % 2000 === 0) {
        console.log(
          `[cluster-senses-chirho] Inserted ${parsedChirho}/${linesChirho.length} lemmas...`
        );
      }
    } catch (errorChirho) {
      console.error(
        `[cluster-senses-chirho] Failed to parse line: ${lineChirho.substring(0, 100)}`
      );
    }
  }

  dbChirho.run("COMMIT");

  // Verify counts
  const senseCountChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM sense_chirho")
    .get();
  const assignmentCountChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM sense_assignment_chirho")
    .get();

  console.log("\n[cluster-senses-chirho] === RESULTS ===");
  console.log(`  Lemmas processed:     ${parsedChirho}`);
  console.log(`  Total senses:         ${senseCountChirho.cnt_chirho}`);
  console.log(`  Total assignments:    ${assignmentCountChirho.cnt_chirho}`);
  console.log(`  Single-sense lemmas:  ${singleSenseCountChirho}`);
  console.log(`  Multi-sense lemmas:   ${multiSenseCountChirho}`);
  console.log(
    `  Avg senses/lemma:     ${(totalSensesChirho / Math.max(parsedChirho, 1)).toFixed(2)}`
  );

  // Show distribution
  const distributionChirho: any[] = dbChirho
    .query(
      `SELECT sense_count_chirho, COUNT(*) as lemma_count_chirho
       FROM (
         SELECT lemma_id_chirho, COUNT(*) as sense_count_chirho
         FROM sense_chirho
         GROUP BY lemma_id_chirho
       )
       GROUP BY sense_count_chirho
       ORDER BY sense_count_chirho`
    )
    .all();

  console.log("\n  Sense distribution:");
  for (const dChirho of distributionChirho) {
    console.log(
      `    ${dChirho.sense_count_chirho}-sense: ${dChirho.lemma_count_chirho} lemmas`
    );
  }

  dbChirho.close();
  console.log("\n[cluster-senses-chirho] Done.");
}

clusterSensesChirho();
