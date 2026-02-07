// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import { spawnSync } from "child_process";
import { existsSync } from "fs";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";
const CRATES_DIR_CHIRHO = "./crates-chirho";

function materializeChirho(): void {
  // Build Rust binary in release mode
  console.log("[materialize-chirho] Building Rust binary...");
  const buildResultChirho = spawnSync("cargo", ["build", "--release", "-p", "materialize-chirho"], {
    cwd: CRATES_DIR_CHIRHO,
    stdio: "inherit",
    env: { ...process.env },
  });

  if (buildResultChirho.status !== 0) {
    console.error("[materialize-chirho] Build failed!");
    process.exit(1);
  }

  // Find binary
  const binaryPathChirho = `${CRATES_DIR_CHIRHO}/target/release/materialize-chirho`;
  if (!existsSync(binaryPathChirho)) {
    console.error(`[materialize-chirho] Binary not found: ${binaryPathChirho}`);
    process.exit(1);
  }

  // Run the binary
  console.log("[materialize-chirho] Running materialization...");
  const runResultChirho = spawnSync(binaryPathChirho, [], {
    stdio: "inherit",
    env: {
      ...process.env,
      SQLITE_PATH_CHIRHO: SQLITE_PATH_CHIRHO,
    },
  });

  if (runResultChirho.status !== 0) {
    console.error("[materialize-chirho] Materialization failed!");
    process.exit(1);
  }

  // Verify results
  console.log("\n[materialize-chirho] Verifying results...");
  const dbChirho = new Database(SQLITE_PATH_CHIRHO);

  const countsChirho = [
    { nameChirho: "gloss_phrase_chirho", tableChirho: "gloss_phrase_chirho" },
    { nameChirho: "gloss_part_chirho", tableChirho: "gloss_part_chirho" },
    { nameChirho: "gloss_head_chirho", tableChirho: "gloss_head_chirho" },
    { nameChirho: "gloss_alt_chirho", tableChirho: "gloss_alt_chirho" },
    { nameChirho: "dictionary_chirho", tableChirho: "dictionary_chirho" },
  ];

  for (const cChirho of countsChirho) {
    const resultChirho: any = dbChirho
      .query(`SELECT COUNT(*) as cnt_chirho FROM ${cChirho.tableChirho}`)
      .get();
    console.log(`  ${cChirho.nameChirho}: ${resultChirho.cnt_chirho} rows`);
  }

  dbChirho.close();
  console.log("[materialize-chirho] Done.");
}

materializeChirho();
