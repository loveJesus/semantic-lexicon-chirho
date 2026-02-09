// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";
const TARGET_K_CHIRHO = 32;

type FeatureVecChirho = Map<string, number>;

/** Cosine similarity between two sparse feature vectors. */
function cosineSimilarityChirho(
  aChirho: FeatureVecChirho,
  bChirho: FeatureVecChirho
): number {
  let dotChirho = 0;
  let normAChirho = 0;
  let normBChirho = 0;

  for (const [keyChirho, valChirho] of aChirho) {
    normAChirho += valChirho * valChirho;
    const bValChirho = bChirho.get(keyChirho);
    if (bValChirho !== undefined) {
      dotChirho += valChirho * bValChirho;
    }
  }
  for (const [, valChirho] of bChirho) {
    normBChirho += valChirho * valChirho;
  }

  const denomChirho = Math.sqrt(normAChirho) * Math.sqrt(normBChirho);
  return denomChirho === 0 ? 0 : dotChirho / denomChirho;
}

/** Build prototype vector for a fine community by averaging its member sense prototypes. */
function buildCommunityPrototypeChirho(
  dbChirho: Database,
  domainIdChirho: number,
  langHashChirho: Map<string, number>,
  phraseStmtChirho: any,
  headStmtChirho: any
): FeatureVecChirho {
  const prototypeChirho: FeatureVecChirho = new Map();

  // Get sense IDs in this community
  const senseIdsChirho: any[] = dbChirho
    .query(
      `SELECT da.sense_id_chirho
       FROM domain_assignment_chirho da
       WHERE da.domain_id_chirho = ?1 AND da.source_chirho = 'community'`
    )
    .all(domainIdChirho);

  if (senseIdsChirho.length === 0) return prototypeChirho;

  // Sample up to 100 senses
  const sampleChirho =
    senseIdsChirho.length > 100
      ? senseIdsChirho.filter(
          (_: any, iChirho: number) =>
            iChirho % Math.floor(senseIdsChirho.length / 100) === 0
        ).slice(0, 100)
      : senseIdsChirho;

  let totalOccsChirho = 0;

  for (const sChirho of sampleChirho) {
    // Get up to 10 occurrences per sense
    const occsChirho: any[] = dbChirho
      .query(
        `SELECT occurrence_id_chirho FROM sense_assignment_chirho
         WHERE sense_id_chirho = ?1 LIMIT 10`
      )
      .all(sChirho.sense_id_chirho);

    for (const occChirho of occsChirho) {
      const widChirho = occChirho.occurrence_id_chirho;

      // Phrase features (weight 3.0)
      const phrasesChirho: any[] = phraseStmtChirho.all(widChirho);
      for (const pChirho of phrasesChirho) {
        const baseChirho = langHashChirho.get(pChirho.language_code_chirho);
        if (baseChirho !== undefined) {
          const keyChirho = `p:${baseChirho + pChirho.phrase_id_chirho}`;
          prototypeChirho.set(
            keyChirho,
            (prototypeChirho.get(keyChirho) || 0) + 3.0
          );
        }
      }

      // Head features (weight 2.0)
      const headsChirho: any[] = headStmtChirho.all(widChirho);
      for (const hChirho of headsChirho) {
        const baseChirho = langHashChirho.get(hChirho.language_code_chirho);
        if (baseChirho !== undefined) {
          const keyChirho = `h:${baseChirho + 500000 + hChirho.head_id_chirho}`;
          prototypeChirho.set(
            keyChirho,
            (prototypeChirho.get(keyChirho) || 0) + 2.0
          );
        }
      }

      totalOccsChirho++;
    }
  }

  // Normalize by total occurrences sampled
  if (totalOccsChirho > 0) {
    for (const [keyChirho, valChirho] of prototypeChirho) {
      prototypeChirho.set(keyChirho, valChirho / totalOccsChirho);
    }
  }

  return prototypeChirho;
}

/** Agglomerative clustering (average-link) to merge 1246 communities into ~32 macro-clusters. */
function agglomerativeClusterChirho(
  similarityMatrixChirho: number[][],
  targetKChirho: number
): number[] {
  const nChirho = similarityMatrixChirho.length;
  // Each element starts as its own cluster
  const clusterAssignChirho = Array.from({ length: nChirho }, (_: any, iChirho: number) => iChirho);
  const activeChirho = new Set(Array.from({ length: nChirho }, (_: any, iChirho: number) => iChirho));

  // Track cluster members for average-link computation
  const clusterMembersChirho: Map<number, number[]> = new Map();
  for (let iChirho = 0; iChirho < nChirho; iChirho++) {
    clusterMembersChirho.set(iChirho, [iChirho]);
  }

  let currentKChirho = nChirho;
  let nextClusterIdChirho = nChirho;

  while (currentKChirho > targetKChirho) {
    // Find most similar pair of active clusters
    let bestSimChirho = -1;
    let bestIChirho = -1;
    let bestJChirho = -1;

    const activeArrayChirho = Array.from(activeChirho);
    for (let iiChirho = 0; iiChirho < activeArrayChirho.length; iiChirho++) {
      for (let jjChirho = iiChirho + 1; jjChirho < activeArrayChirho.length; jjChirho++) {
        const cIChirho = activeArrayChirho[iiChirho];
        const cJChirho = activeArrayChirho[jjChirho];
        const membersIChirho = clusterMembersChirho.get(cIChirho)!;
        const membersJChirho = clusterMembersChirho.get(cJChirho)!;

        // Average-link similarity
        let sumSimChirho = 0;
        let pairsChirho = 0;
        for (const mIChirho of membersIChirho) {
          for (const mJChirho of membersJChirho) {
            sumSimChirho += similarityMatrixChirho[mIChirho][mJChirho];
            pairsChirho++;
          }
        }
        const avgSimChirho = pairsChirho > 0 ? sumSimChirho / pairsChirho : 0;

        if (avgSimChirho > bestSimChirho) {
          bestSimChirho = avgSimChirho;
          bestIChirho = cIChirho;
          bestJChirho = cJChirho;
        }
      }
    }

    if (bestIChirho === -1) break;

    // Merge bestJ into bestI
    const newClusterIdChirho = nextClusterIdChirho++;
    const mergedMembersChirho = [
      ...clusterMembersChirho.get(bestIChirho)!,
      ...clusterMembersChirho.get(bestJChirho)!,
    ];
    clusterMembersChirho.set(newClusterIdChirho, mergedMembersChirho);
    activeChirho.delete(bestIChirho);
    activeChirho.delete(bestJChirho);
    activeChirho.add(newClusterIdChirho);

    currentKChirho--;

    if (currentKChirho % 100 === 0 || currentKChirho <= targetKChirho + 5) {
      console.log(
        `  [agglomerative] k=${currentKChirho}, merged sim=${bestSimChirho.toFixed(4)}`
      );
    }
  }

  // Map original indices to final cluster IDs (0..targetK-1)
  const resultChirho = new Array(nChirho).fill(-1);
  let finalClusterChirho = 0;
  for (const clusterIdChirho of activeChirho) {
    const membersChirho = clusterMembersChirho.get(clusterIdChirho)!;
    for (const mChirho of membersChirho) {
      resultChirho[mChirho] = finalClusterChirho;
    }
    finalClusterChirho++;
  }

  return resultChirho;
}

function mainChirho(): void {
  const dbChirho = new Database(SQLITE_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");
  dbChirho.run("PRAGMA synchronous=NORMAL");
  dbChirho.run("PRAGMA cache_size=-64000");

  // Get all fine communities
  const communitiesChirho: any[] = dbChirho
    .query(
      `SELECT domain_id_chirho, name_chirho FROM domain_chirho
       WHERE level_chirho = 1 AND hierarchy_chirho = 'community'
       ORDER BY domain_id_chirho`
    )
    .all();

  console.log(
    `[cluster-supersenses-chirho] Building prototypes for ${communitiesChirho.length} fine communities...`
  );

  // Build language hash
  const langHashChirho: Map<string, number> = new Map();
  const langsChirho: any[] = dbChirho
    .query("SELECT DISTINCT language_code_chirho FROM gloss_phrase_chirho")
    .all();
  langsChirho.forEach((lChirho: any, idxChirho: number) => {
    langHashChirho.set(lChirho.language_code_chirho, (idxChirho + 1) * 1_000_000);
  });

  const phraseStmtChirho = dbChirho.prepare(
    "SELECT language_code_chirho, phrase_id_chirho FROM gloss_phrase_chirho WHERE occurrence_id_chirho = ?1"
  );
  const headStmtChirho = dbChirho.prepare(
    "SELECT language_code_chirho, head_id_chirho FROM gloss_head_chirho WHERE occurrence_id_chirho = ?1"
  );

  // Build community prototypes
  const prototypesChirho: FeatureVecChirho[] = [];
  const domainIdsChirho: number[] = [];

  for (let iChirho = 0; iChirho < communitiesChirho.length; iChirho++) {
    const commChirho = communitiesChirho[iChirho];
    const protoChirho = buildCommunityPrototypeChirho(
      dbChirho,
      commChirho.domain_id_chirho,
      langHashChirho,
      phraseStmtChirho,
      headStmtChirho
    );
    prototypesChirho.push(protoChirho);
    domainIdsChirho.push(commChirho.domain_id_chirho);

    if ((iChirho + 1) % 200 === 0) {
      console.log(
        `  Built ${iChirho + 1}/${communitiesChirho.length} community prototypes`
      );
    }
  }

  console.log(
    `[cluster-supersenses-chirho] ${prototypesChirho.length} prototypes built. Computing similarity matrix...`
  );

  // Compute pairwise similarity (1246 x 1246 = ~775K pairs — manageable in JS)
  const nChirho = prototypesChirho.length;
  const simMatrixChirho: number[][] = Array.from({ length: nChirho }, () =>
    new Array(nChirho).fill(0)
  );

  for (let iChirho = 0; iChirho < nChirho; iChirho++) {
    simMatrixChirho[iChirho][iChirho] = 1.0;
    for (let jChirho = iChirho + 1; jChirho < nChirho; jChirho++) {
      const simChirho = cosineSimilarityChirho(
        prototypesChirho[iChirho],
        prototypesChirho[jChirho]
      );
      simMatrixChirho[iChirho][jChirho] = simChirho;
      simMatrixChirho[jChirho][iChirho] = simChirho;
    }

    if ((iChirho + 1) % 200 === 0) {
      console.log(`  Similarity: ${iChirho + 1}/${nChirho} rows computed`);
    }
  }

  console.log(
    `[cluster-supersenses-chirho] Running agglomerative clustering to k=${TARGET_K_CHIRHO}...`
  );

  // Run agglomerative clustering
  const clusterAssignmentsChirho = agglomerativeClusterChirho(
    simMatrixChirho,
    TARGET_K_CHIRHO
  );

  // Count members per macro-cluster
  const clusterSizesChirho = new Map<number, number>();
  for (const cChirho of clusterAssignmentsChirho) {
    clusterSizesChirho.set(cChirho, (clusterSizesChirho.get(cChirho) || 0) + 1);
  }

  console.log(
    `\n[cluster-supersenses-chirho] ${clusterSizesChirho.size} macro-clusters created`
  );

  // Insert data-driven supersenses
  dbChirho.run("BEGIN");

  const insertSuperChirho = dbChirho.prepare(
    `INSERT INTO domain_chirho (name_chirho, level_chirho, hierarchy_chirho, description_chirho)
     VALUES (?1, 0, 'data32', ?2)`
  );

  // Create a mapping table: fine community → data32 supersense
  // We'll store it as parent_id updates or as domain_assignment rows
  const macroClusterIdsChirho: Map<number, number> = new Map(); // clusterIdx → domain_id

  const sortedClustersChirho = Array.from(clusterSizesChirho.entries()).sort(
    (aChirho, bChirho) => bChirho[1] - aChirho[1]
  );

  for (const [clusterIdxChirho, sizeChirho] of sortedClustersChirho) {
    // Gather sample sense labels for this macro-cluster
    const memberCommunitiesChirho: number[] = [];
    for (let iChirho = 0; iChirho < clusterAssignmentsChirho.length; iChirho++) {
      if (clusterAssignmentsChirho[iChirho] === clusterIdxChirho) {
        memberCommunitiesChirho.push(domainIdsChirho[iChirho]);
      }
    }

    // Sample some sense labels from member communities
    const sampleLabelsChirho: string[] = [];
    for (const commIdChirho of memberCommunitiesChirho.slice(0, 5)) {
      const labelsChirho: any[] = dbChirho
        .query(
          `SELECT s.label_chirho FROM sense_chirho s
           JOIN domain_assignment_chirho da ON s.sense_id_chirho = da.sense_id_chirho
           WHERE da.domain_id_chirho = ?1 AND s.label_chirho IS NOT NULL
           LIMIT 5`
        )
        .all(commIdChirho);
      for (const lChirho of labelsChirho) {
        if (lChirho.label_chirho) sampleLabelsChirho.push(lChirho.label_chirho);
      }
    }

    const descChirho = `Data-driven macro-cluster ${clusterIdxChirho}: ${sizeChirho} fine communities. Sample senses: ${sampleLabelsChirho.slice(0, 10).join(", ")}`;

    insertSuperChirho.run(`DATA32_${clusterIdxChirho + 1}`, descChirho);

    const newIdChirho: any = dbChirho
      .query("SELECT last_insert_rowid() as id_chirho")
      .get();
    macroClusterIdsChirho.set(clusterIdxChirho, newIdChirho.id_chirho);
  }

  // Map each fine community to its data32 supersense
  const insertMappingChirho = dbChirho.prepare(
    `INSERT OR IGNORE INTO domain_assignment_chirho (sense_id_chirho, domain_id_chirho, fit_score_chirho, source_chirho)
     SELECT da.sense_id_chirho, ?2, da.fit_score_chirho, 'data32'
     FROM domain_assignment_chirho da
     WHERE da.domain_id_chirho = ?1 AND da.source_chirho = 'community'`
  );

  // Also update fine community parent_id to point to its data32 supersense
  const updateParentChirho = dbChirho.prepare(
    `UPDATE domain_chirho SET parent_id_chirho = ?2 WHERE domain_id_chirho = ?1`
  );

  let mappedChirho = 0;
  for (let iChirho = 0; iChirho < clusterAssignmentsChirho.length; iChirho++) {
    const clusterIdxChirho = clusterAssignmentsChirho[iChirho];
    const macroIdChirho = macroClusterIdsChirho.get(clusterIdxChirho);
    if (macroIdChirho !== undefined) {
      const fineIdChirho = domainIdsChirho[iChirho];
      updateParentChirho.run(fineIdChirho, macroIdChirho);
      insertMappingChirho.run(fineIdChirho, macroIdChirho);
      mappedChirho++;
    }
  }

  dbChirho.run("COMMIT");

  // Stats
  const data32CountChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM domain_chirho WHERE hierarchy_chirho = 'data32'")
    .get();

  const totalAssignChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM domain_assignment_chirho WHERE source_chirho = 'data32'")
    .get();

  console.log("\n[cluster-supersenses-chirho] === RESULTS ===");
  console.log(`  Data-driven supersenses: ${data32CountChirho.cnt_chirho}`);
  console.log(`  Fine communities mapped: ${mappedChirho}`);
  console.log(`  Sense→data32 assignments: ${totalAssignChirho.cnt_chirho}`);

  // Print macro-cluster sizes
  console.log("\n  Macro-cluster sizes:");
  for (const [clusterIdxChirho, sizeChirho] of sortedClustersChirho) {
    const macroIdChirho = macroClusterIdsChirho.get(clusterIdxChirho)!;
    console.log(`    DATA32_${clusterIdxChirho + 1} (domain ${macroIdChirho}): ${sizeChirho} communities`);
  }

  dbChirho.close();
  console.log("\n[cluster-supersenses-chirho] Done.");
}

mainChirho();
