// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import { spawnSync } from "child_process";
import { existsSync } from "fs";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";
const CRATES_DIR_CHIRHO = "./crates-chirho";

interface EdgeChirho {
  senseAChirho: number;
  senseBChirho: number;
  similarityChirho: number;
}

// Simple Louvain-like community detection (greedy modularity optimization)
function detectCommunitiesChirho(
  nodesChirho: Set<number>,
  edgesChirho: EdgeChirho[]
): Map<number, number> {
  // Build adjacency: node -> [(neighbor, weight)]
  const adjChirho = new Map<number, Map<number, number>>();
  let totalWeightChirho = 0;

  for (const nodeChirho of nodesChirho) {
    adjChirho.set(nodeChirho, new Map());
  }

  for (const edgeChirho of edgesChirho) {
    const aMapChirho = adjChirho.get(edgeChirho.senseAChirho);
    const bMapChirho = adjChirho.get(edgeChirho.senseBChirho);
    if (aMapChirho) {
      aMapChirho.set(
        edgeChirho.senseBChirho,
        (aMapChirho.get(edgeChirho.senseBChirho) || 0) +
          edgeChirho.similarityChirho
      );
    }
    if (bMapChirho) {
      bMapChirho.set(
        edgeChirho.senseAChirho,
        (bMapChirho.get(edgeChirho.senseAChirho) || 0) +
          edgeChirho.similarityChirho
      );
    }
    totalWeightChirho += edgeChirho.similarityChirho;
  }

  // Start: each node in its own community
  const communityChirho = new Map<number, number>();
  let nextCommunityChirho = 0;
  for (const nodeChirho of nodesChirho) {
    communityChirho.set(nodeChirho, nextCommunityChirho++);
  }

  // Node strengths (sum of edge weights)
  const strengthChirho = new Map<number, number>();
  for (const nodeChirho of nodesChirho) {
    let sChirho = 0;
    const neighborsChirho = adjChirho.get(nodeChirho);
    if (neighborsChirho) {
      for (const wChirho of neighborsChirho.values()) {
        sChirho += wChirho;
      }
    }
    strengthChirho.set(nodeChirho, sChirho);
  }

  // Greedy local moves (one pass)
  const nodeArrayChirho = Array.from(nodesChirho);
  let movedChirho = true;
  let iterationChirho = 0;

  while (movedChirho && iterationChirho < 20) {
    movedChirho = false;
    iterationChirho++;

    for (const nodeChirho of nodeArrayChirho) {
      const currentCommChirho = communityChirho.get(nodeChirho)!;
      const nodeStrChirho = strengthChirho.get(nodeChirho)!;
      const neighborsChirho = adjChirho.get(nodeChirho);
      if (!neighborsChirho || neighborsChirho.size === 0) continue;

      // Compute weight to each neighboring community
      const commWeightChirho = new Map<number, number>();
      for (const [nbChirho, wChirho] of neighborsChirho) {
        const nbCommChirho = communityChirho.get(nbChirho)!;
        commWeightChirho.set(
          nbCommChirho,
          (commWeightChirho.get(nbCommChirho) || 0) + wChirho
        );
      }

      // Find best community (max modularity gain)
      let bestCommChirho = currentCommChirho;
      let bestGainChirho = 0;
      const currentWeightChirho = commWeightChirho.get(currentCommChirho) || 0;

      for (const [commChirho, wChirho] of commWeightChirho) {
        if (commChirho === currentCommChirho) continue;
        const gainChirho = wChirho - currentWeightChirho;
        if (gainChirho > bestGainChirho) {
          bestGainChirho = gainChirho;
          bestCommChirho = commChirho;
        }
      }

      if (bestCommChirho !== currentCommChirho) {
        communityChirho.set(nodeChirho, bestCommChirho);
        movedChirho = true;
      }
    }
  }

  return communityChirho;
}

function detectDomainsChirho(): void {
  // Build similarity-chirho
  console.log("[detect-domains-chirho] Building similarity-chirho...");
  const buildResultChirho = spawnSync(
    "cargo",
    ["build", "--release", "-p", "similarity-chirho"],
    {
      cwd: CRATES_DIR_CHIRHO,
      stdio: "inherit",
      env: { ...process.env },
    }
  );

  if (buildResultChirho.status !== 0) {
    console.error("[detect-domains-chirho] Build failed!");
    process.exit(1);
  }

  const binaryPathChirho = `${CRATES_DIR_CHIRHO}/target/release/similarity-chirho`;
  if (!existsSync(binaryPathChirho)) {
    console.error(`Binary not found: ${binaryPathChirho}`);
    process.exit(1);
  }

  // Run similarity computation
  console.log(
    "[detect-domains-chirho] Running similarity computation (this may take a while)..."
  );
  const runResultChirho = spawnSync(binaryPathChirho, [], {
    stdio: ["inherit", "pipe", "inherit"],
    env: {
      ...process.env,
      SQLITE_PATH_CHIRHO: SQLITE_PATH_CHIRHO,
    },
    maxBuffer: 2000 * 1024 * 1024, // 2GB
    timeout: 3600000, // 1 hour
  });

  if (runResultChirho.status !== 0) {
    console.error("[detect-domains-chirho] Similarity computation failed!");
    process.exit(1);
  }

  const stdoutChirho = runResultChirho.stdout?.toString() || "";
  const linesChirho = stdoutChirho
    .split("\n")
    .filter((lChirho: string) => lChirho.trim().length > 0);

  console.log(`[detect-domains-chirho] Received ${linesChirho.length} edges`);

  // Parse edges
  const edgesChirho: EdgeChirho[] = [];
  const nodesChirho = new Set<number>();

  for (const lineChirho of linesChirho) {
    try {
      const edgeChirho: EdgeChirho = JSON.parse(lineChirho);
      edgesChirho.push(edgeChirho);
      nodesChirho.add(edgeChirho.senseAChirho);
      nodesChirho.add(edgeChirho.senseBChirho);
    } catch {
      // skip
    }
  }

  console.log(
    `[detect-domains-chirho] Graph: ${nodesChirho.size} nodes, ${edgesChirho.length} edges`
  );

  // Run community detection
  console.log("[detect-domains-chirho] Running community detection...");
  const communitiesChirho = detectCommunitiesChirho(nodesChirho, edgesChirho);

  // Count communities
  const communityCountsChirho = new Map<number, number>();
  for (const commChirho of communitiesChirho.values()) {
    communityCountsChirho.set(
      commChirho,
      (communityCountsChirho.get(commChirho) || 0) + 1
    );
  }

  console.log(
    `[detect-domains-chirho] Detected ${communityCountsChirho.size} communities`
  );

  // Map communities to fine domains under supersenses
  const dbChirho = new Database(SQLITE_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");
  dbChirho.run("PRAGMA synchronous=NORMAL");

  // Get existing supersenses
  const supersensesChirho: any[] = dbChirho
    .query(
      "SELECT domain_id_chirho, name_chirho FROM domain_chirho WHERE level_chirho = 0"
    )
    .all();

  if (supersensesChirho.length === 0) {
    console.error(
      "[detect-domains-chirho] No supersenses found! Run seed-domains-chirho first."
    );
    process.exit(1);
  }

  // For each community, create a fine domain and assign to nearest supersense
  // Use round-robin assignment to supersenses for now (will be refined by assign-domains)
  const insertDomainChirho = dbChirho.prepare(
    `INSERT INTO domain_chirho (parent_id_chirho, name_chirho, level_chirho, description_chirho)
     VALUES (?1, ?2, 1, ?3)`
  );

  const insertAncestorChirho = dbChirho.prepare(
    `INSERT OR IGNORE INTO domain_ancestor_chirho (domain_id_chirho, ancestor_id_chirho, depth_chirho)
     VALUES (?1, ?2, ?3)`
  );

  dbChirho.run("BEGIN");

  // Filter out tiny communities (< 3 senses) — merge into "misc" domains
  const significantChirho = Array.from(communityCountsChirho.entries())
    .filter(([, countChirho]) => countChirho >= 3)
    .sort((aChirho, bChirho) => bChirho[1] - aChirho[1]);

  let createdChirho = 0;
  for (let iChirho = 0; iChirho < significantChirho.length; iChirho++) {
    const [commIdChirho, sizeChirho] = significantChirho[iChirho];
    const parentChirho =
      supersensesChirho[iChirho % supersensesChirho.length];

    insertDomainChirho.run(
      parentChirho.domain_id_chirho,
      `${parentChirho.name_chirho}_${iChirho + 1}`,
      `Auto-detected community ${commIdChirho} with ${sizeChirho} senses`
    );

    const newIdChirho: any = dbChirho
      .query("SELECT last_insert_rowid() as id_chirho")
      .get();
    const domainIdChirho = newIdChirho.id_chirho;

    // Ancestor: self at depth 0, parent at depth 1
    insertAncestorChirho.run(domainIdChirho, domainIdChirho, 0);
    insertAncestorChirho.run(
      domainIdChirho,
      parentChirho.domain_id_chirho,
      1
    );

    createdChirho++;
  }

  dbChirho.run("COMMIT");

  const totalDomainsChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM domain_chirho")
    .get();
  const fineDomainsChirho: any = dbChirho
    .query(
      "SELECT COUNT(*) as cnt_chirho FROM domain_chirho WHERE level_chirho = 1"
    )
    .get();

  console.log("\n[detect-domains-chirho] === RESULTS ===");
  console.log(`  Total communities:    ${communityCountsChirho.size}`);
  console.log(`  Significant (3+):     ${significantChirho.length}`);
  console.log(`  Fine domains created: ${createdChirho}`);
  console.log(`  Total domains:        ${totalDomainsChirho.cnt_chirho}`);
  console.log(
    `  Supersenses:          ${supersensesChirho.length}`
  );
  console.log(`  Fine domains:         ${fineDomainsChirho.cnt_chirho}`);

  dbChirho.close();
  console.log("[detect-domains-chirho] Done.");
}

detectDomainsChirho();
