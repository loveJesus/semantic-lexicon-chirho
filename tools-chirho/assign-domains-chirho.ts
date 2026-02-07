// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";

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

/** Build a prototype feature vector for a sense by averaging its member occurrence vectors. */
function buildPrototypeChirho(
  dbChirho: Database,
  senseIdChirho: number,
  langHashChirho: Map<string, number>
): FeatureVecChirho {
  const prototypeChirho: FeatureVecChirho = new Map();

  // Get occurrence IDs for this sense (sample up to 50)
  const occIdsChirho: any[] = dbChirho
    .query(
      "SELECT occurrence_id_chirho FROM sense_assignment_chirho WHERE sense_id_chirho = ?1"
    )
    .all(senseIdChirho);

  if (occIdsChirho.length === 0) return prototypeChirho;

  const sampleChirho =
    occIdsChirho.length > 50
      ? occIdsChirho.filter(
          (_: any, iChirho: number) =>
            iChirho % Math.floor(occIdsChirho.length / 50) === 0
        ).slice(0, 50)
      : occIdsChirho;

  const sampleCountChirho = sampleChirho.length;

  const phraseStmtChirho = dbChirho.prepare(
    "SELECT language_code_chirho, phrase_id_chirho FROM gloss_phrase_chirho WHERE occurrence_id_chirho = ?1"
  );
  const headStmtChirho = dbChirho.prepare(
    "SELECT language_code_chirho, head_id_chirho FROM gloss_head_chirho WHERE occurrence_id_chirho = ?1"
  );

  for (const occChirho of sampleChirho) {
    const widChirho = occChirho.occurrence_id_chirho;

    // Phrase features (weight 3.0)
    const phrasesChirho: any[] = phraseStmtChirho.all(widChirho);
    for (const pChirho of phrasesChirho) {
      const baseChirho = langHashChirho.get(pChirho.language_code_chirho);
      if (baseChirho !== undefined) {
        const keyChirho = `p:${baseChirho + pChirho.phrase_id_chirho}`;
        prototypeChirho.set(
          keyChirho,
          (prototypeChirho.get(keyChirho) || 0) + 3.0 / sampleCountChirho
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
          (prototypeChirho.get(keyChirho) || 0) + 2.0 / sampleCountChirho
        );
      }
    }
  }

  return prototypeChirho;
}

function assignDomainsChirho(): void {
  const dbChirho = new Database(SQLITE_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");
  dbChirho.run("PRAGMA synchronous=NORMAL");
  dbChirho.run("PRAGMA cache_size=-64000");

  // Get all senses
  const sensesChirho: any[] = dbChirho
    .query("SELECT sense_id_chirho, lemma_id_chirho FROM sense_chirho")
    .all();

  // Get all fine domains (level 1) with their parent supersense
  const fineDomainsChirho: any[] = dbChirho
    .query(
      `SELECT d.domain_id_chirho, d.name_chirho, d.parent_id_chirho,
              p.name_chirho as parent_name_chirho
       FROM domain_chirho d
       LEFT JOIN domain_chirho p ON d.parent_id_chirho = p.domain_id_chirho
       WHERE d.level_chirho = 1`
    )
    .all();

  // Get all supersense domains
  const supersensesChirho: any[] = dbChirho
    .query(
      "SELECT domain_id_chirho, name_chirho FROM domain_chirho WHERE level_chirho = 0"
    )
    .all();

  console.log(
    `[assign-domains-chirho] Assigning ${sensesChirho.length} senses to ${fineDomainsChirho.length} fine domains (${supersensesChirho.length} supersenses)`
  );

  // Build language hash map
  const langHashChirho: Map<string, number> = new Map();
  const langsChirho: any[] = dbChirho
    .query(
      "SELECT DISTINCT language_code_chirho FROM gloss_phrase_chirho"
    )
    .all();
  langsChirho.forEach((lChirho: any, idxChirho: number) => {
    langHashChirho.set(
      lChirho.language_code_chirho,
      (idxChirho + 1) * 1_000_000
    );
  });

  // Build prototype vectors for each supersense domain
  // by averaging prototypes of senses assigned to it via community detection (fine domains)
  // If no fine domains exist, we build supersense prototypes directly from senses
  const targetDomainsChirho =
    fineDomainsChirho.length > 0 ? fineDomainsChirho : supersensesChirho;
  const targetLevelChirho = fineDomainsChirho.length > 0 ? "fine" : "super";

  console.log(
    `[assign-domains-chirho] Building prototype vectors for ${supersensesChirho.length} supersenses...`
  );

  // Build prototype vector for each sense
  const sensePrototypesChirho: Map<number, FeatureVecChirho> = new Map();
  let builtChirho = 0;
  for (const senseChirho of sensesChirho) {
    const protoChirho = buildPrototypeChirho(
      dbChirho,
      senseChirho.sense_id_chirho,
      langHashChirho
    );
    if (protoChirho.size > 0) {
      sensePrototypesChirho.set(senseChirho.sense_id_chirho, protoChirho);
    }
    builtChirho++;
    if (builtChirho % 5000 === 0) {
      console.log(
        `[assign-domains-chirho] Built ${builtChirho}/${sensesChirho.length} sense prototypes`
      );
    }
  }

  console.log(
    `[assign-domains-chirho] ${sensePrototypesChirho.size} sense prototypes built`
  );

  // Build supersense centroids by averaging a sample of sense prototypes
  // Use existing domain_assignment if available, otherwise partition senses equally
  const supersenseCentroidsChirho: Map<number, FeatureVecChirho> = new Map();

  // Check if there are existing assignments from community detection
  const existingAssignChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM domain_assignment_chirho")
    .get();

  if (existingAssignChirho.cnt_chirho > 0 && fineDomainsChirho.length > 0) {
    // Use fine domain → parent supersense mapping from community detection
    for (const ssChirho of supersensesChirho) {
      const centroidChirho: FeatureVecChirho = new Map();
      let countChirho = 0;

      // Get senses assigned to this supersense's children
      const childSensesChirho: any[] = dbChirho
        .query(
          `SELECT da.sense_id_chirho
           FROM domain_assignment_chirho da
           JOIN domain_chirho d ON da.domain_id_chirho = d.domain_id_chirho
           WHERE d.parent_id_chirho = ?1 OR da.domain_id_chirho = ?1
           LIMIT 200`
        )
        .all(ssChirho.domain_id_chirho);

      for (const csChirho of childSensesChirho) {
        const protoChirho = sensePrototypesChirho.get(csChirho.sense_id_chirho);
        if (!protoChirho) continue;
        for (const [keyChirho, valChirho] of protoChirho) {
          centroidChirho.set(
            keyChirho,
            (centroidChirho.get(keyChirho) || 0) + valChirho
          );
        }
        countChirho++;
      }

      // Normalize
      if (countChirho > 0) {
        for (const [keyChirho, valChirho] of centroidChirho) {
          centroidChirho.set(keyChirho, valChirho / countChirho);
        }
      }
      supersenseCentroidsChirho.set(ssChirho.domain_id_chirho, centroidChirho);
    }
  } else {
    // No existing assignments — bootstrap centroids by partitioning senses by lemma POS
    // Assign each supersense a seed set of senses partitioned by index
    const senseArrayChirho = Array.from(sensePrototypesChirho.entries());
    const chunkSizeChirho = Math.max(
      1,
      Math.ceil(senseArrayChirho.length / supersensesChirho.length)
    );

    for (let iChirho = 0; iChirho < supersensesChirho.length; iChirho++) {
      const centroidChirho: FeatureVecChirho = new Map();
      const startChirho = iChirho * chunkSizeChirho;
      const endChirho = Math.min(
        startChirho + chunkSizeChirho,
        senseArrayChirho.length
      );
      const sliceChirho = senseArrayChirho.slice(startChirho, endChirho);

      for (const [, protoChirho] of sliceChirho) {
        for (const [keyChirho, valChirho] of protoChirho) {
          centroidChirho.set(
            keyChirho,
            (centroidChirho.get(keyChirho) || 0) + valChirho
          );
        }
      }

      // Normalize
      if (sliceChirho.length > 0) {
        for (const [keyChirho, valChirho] of centroidChirho) {
          centroidChirho.set(keyChirho, valChirho / sliceChirho.length);
        }
      }
      supersenseCentroidsChirho.set(
        supersensesChirho[iChirho].domain_id_chirho,
        centroidChirho
      );
    }
  }

  console.log(
    `[assign-domains-chirho] ${supersenseCentroidsChirho.size} supersense centroids built. Assigning senses...`
  );

  // Nearest-centroid assignment
  dbChirho.run("DELETE FROM domain_assignment_chirho");
  dbChirho.run("BEGIN");

  const insertChirho = dbChirho.prepare(
    `INSERT INTO domain_assignment_chirho (sense_id_chirho, domain_id_chirho, fit_score_chirho, source_chirho)
     VALUES (?1, ?2, ?3, 'auto')`
  );

  const insertParentChirho = dbChirho.prepare(
    `INSERT OR IGNORE INTO domain_assignment_chirho (sense_id_chirho, domain_id_chirho, fit_score_chirho, source_chirho)
     VALUES (?1, ?2, ?3, 'auto_hierarchy')`
  );

  let assignedChirho = 0;
  const supersenseIdsChirho = Array.from(supersenseCentroidsChirho.keys());

  for (const senseChirho of sensesChirho) {
    const protoChirho = sensePrototypesChirho.get(
      senseChirho.sense_id_chirho
    );

    if (!protoChirho || protoChirho.size === 0) {
      // Fallback: assign to first supersense with low confidence
      if (supersenseIdsChirho.length > 0) {
        insertChirho.run(
          senseChirho.sense_id_chirho,
          supersenseIdsChirho[0],
          0.1
        );
      }
      assignedChirho++;
      continue;
    }

    // Find nearest supersense centroid
    let bestDomainIdChirho = supersenseIdsChirho[0];
    let bestSimChirho = -1;

    for (const [domainIdChirho, centroidChirho] of supersenseCentroidsChirho) {
      if (centroidChirho.size === 0) continue;
      const simChirho = cosineSimilarityChirho(protoChirho, centroidChirho);
      if (simChirho > bestSimChirho) {
        bestSimChirho = simChirho;
        bestDomainIdChirho = domainIdChirho;
      }
    }

    // Assign to best supersense
    const fitScoreChirho = Math.round(bestSimChirho * 10000) / 10000;
    insertChirho.run(
      senseChirho.sense_id_chirho,
      bestDomainIdChirho,
      fitScoreChirho
    );

    // If fine domains exist, also find best fine domain within the supersense
    if (fineDomainsChirho.length > 0) {
      const childFinesChirho = fineDomainsChirho.filter(
        (fChirho: any) => fChirho.parent_id_chirho === bestDomainIdChirho
      );

      if (childFinesChirho.length > 0) {
        // Assign to the fine domain (already handled by community detection)
        // Just ensure the parent link exists
        insertParentChirho.run(
          senseChirho.sense_id_chirho,
          bestDomainIdChirho,
          fitScoreChirho * 0.8
        );
      }
    }

    assignedChirho++;
    if (assignedChirho % 5000 === 0) {
      console.log(
        `[assign-domains-chirho] Assigned ${assignedChirho}/${sensesChirho.length}`
      );
    }
  }

  dbChirho.run("COMMIT");

  // Stats
  const assignCountChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM domain_assignment_chirho")
    .get();
  const multiLabelChirho: any = dbChirho
    .query(
      `SELECT COUNT(*) as cnt_chirho FROM (
         SELECT sense_id_chirho FROM domain_assignment_chirho
         GROUP BY sense_id_chirho
         HAVING COUNT(*) > 1
       )`
    )
    .get();
  const unassignedChirho: any = dbChirho
    .query(
      `SELECT COUNT(*) as cnt_chirho FROM sense_chirho
       WHERE sense_id_chirho NOT IN (SELECT sense_id_chirho FROM domain_assignment_chirho)`
    )
    .get();

  console.log("\n[assign-domains-chirho] === RESULTS ===");
  console.log(`  Total assignments:    ${assignCountChirho.cnt_chirho}`);
  console.log(`  Multi-label senses:   ${multiLabelChirho.cnt_chirho}`);
  console.log(`  Unassigned senses:    ${unassignedChirho.cnt_chirho}`);

  // Distribution across supersenses
  const distChirho: any[] = dbChirho
    .query(
      `SELECT d.name_chirho, COUNT(*) as cnt_chirho,
              ROUND(AVG(da.fit_score_chirho), 4) as avg_fit_chirho
       FROM domain_assignment_chirho da
       JOIN domain_chirho d ON da.domain_id_chirho = d.domain_id_chirho
       WHERE d.level_chirho = 0
       GROUP BY d.name_chirho
       ORDER BY cnt_chirho DESC`
    )
    .all();

  if (distChirho.length > 0) {
    console.log("\n  Distribution by supersense:");
    for (const dChirho of distChirho) {
      console.log(
        `    ${dChirho.name_chirho}: ${dChirho.cnt_chirho} (avg fit: ${dChirho.avg_fit_chirho})`
      );
    }
  }

  // Fit score distribution
  const fitDistChirho: any[] = dbChirho
    .query(
      `SELECT
         CASE
           WHEN fit_score_chirho >= 0.8 THEN 'high (>=0.8)'
           WHEN fit_score_chirho >= 0.4 THEN 'medium (0.4-0.8)'
           WHEN fit_score_chirho >= 0.1 THEN 'low (0.1-0.4)'
           ELSE 'very low (<0.1)'
         END as bucket_chirho,
         COUNT(*) as cnt_chirho
       FROM domain_assignment_chirho
       GROUP BY bucket_chirho
       ORDER BY bucket_chirho`
    )
    .all();

  console.log("\n  Fit score distribution:");
  for (const bChirho of fitDistChirho) {
    console.log(`    ${bChirho.bucket_chirho}: ${bChirho.cnt_chirho}`);
  }

  dbChirho.close();
  console.log("\n[assign-domains-chirho] Done.");
}

assignDomainsChirho();
