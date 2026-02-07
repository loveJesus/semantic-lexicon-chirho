// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";

function prioritizeReviewChirho(): void {
  const dbChirho = new Database(SQLITE_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");
  dbChirho.run("PRAGMA synchronous=NORMAL");

  console.log("[prioritize-chirho] Computing uncertainty scores...");

  // For each lemma: compute uncertainty as combination of:
  // 1. Number of senses (more senses = more complex = higher priority)
  // 2. Average sense entropy from scorecard logic
  // 3. Whether it has been queued as a split candidate

  const lemmasChirho: any[] = dbChirho
    .query(
      `SELECT l.id_chirho, l.gloss_chirho, l.pos_chirho,
              COUNT(DISTINCT s.sense_id_chirho) as sense_count_chirho,
              COUNT(DISTINCT sa.occurrence_id_chirho) as occ_count_chirho
       FROM lemma_chirho l
       LEFT JOIN sense_chirho s ON l.id_chirho = s.lemma_id_chirho
       LEFT JOIN sense_assignment_chirho sa ON s.sense_id_chirho = sa.sense_id_chirho
       GROUP BY l.id_chirho
       HAVING sense_count_chirho > 0
       ORDER BY sense_count_chirho DESC`
    )
    .all();

  console.log(`[prioritize-chirho] Scoring ${lemmasChirho.length} lemmas...`);

  // Get existing review queue items (split candidates)
  const existingQueueChirho = new Set<string>();
  const queueItemsChirho: any[] = dbChirho
    .query("SELECT lemma_id_chirho FROM review_queue_chirho")
    .all();
  for (const qChirho of queueItemsChirho) {
    existingQueueChirho.add(qChirho.lemma_id_chirho);
  }

  interface ScoredLemmaChirho {
    lemmaIdChirho: string;
    scoreChirho: number;
    reasonChirho: string;
    glossChirho: string;
    senseCountChirho: number;
    occCountChirho: number;
  }

  const scoredChirho: ScoredLemmaChirho[] = [];

  for (const lChirho of lemmasChirho) {
    const senseCountChirho = lChirho.sense_count_chirho;
    const occCountChirho = lChirho.occ_count_chirho;

    // Compute uncertainty score
    let scoreChirho = 0;
    const reasonsChirho: string[] = [];

    // Factor 1: More senses = higher uncertainty (weight 0.4)
    const sensePenaltyChirho = Math.min(senseCountChirho / 10, 1.0);
    scoreChirho += sensePenaltyChirho * 0.4;
    if (senseCountChirho > 5) {
      reasonsChirho.push(`high_sense_count(${senseCountChirho})`);
    }

    // Factor 2: High occurrence count + many senses = worth reviewing (weight 0.3)
    const occFactorChirho = Math.min(Math.log10(occCountChirho + 1) / 3, 1.0);
    scoreChirho += occFactorChirho * 0.3;
    if (occCountChirho > 100) {
      reasonsChirho.push(`high_frequency(${occCountChirho})`);
    }

    // Factor 3: Previously flagged as split candidate (weight 0.3)
    if (existingQueueChirho.has(lChirho.id_chirho)) {
      scoreChirho += 0.3;
      reasonsChirho.push("split_candidate");
    }

    scoredChirho.push({
      lemmaIdChirho: lChirho.id_chirho,
      scoreChirho,
      reasonChirho: reasonsChirho.join(", ") || "normal",
      glossChirho: lChirho.gloss_chirho || "",
      senseCountChirho,
      occCountChirho,
    });
  }

  // Sort by score descending, take top 500
  scoredChirho.sort(
    (aChirho, bChirho) => bChirho.scoreChirho - aChirho.scoreChirho
  );
  const topChirho = scoredChirho.slice(0, 500);

  // Write to review_queue_chirho
  dbChirho.run(
    "DELETE FROM review_queue_chirho"
  );
  dbChirho.run("BEGIN");

  const insertChirho = dbChirho.prepare(
    `INSERT OR REPLACE INTO review_queue_chirho
     (lemma_id_chirho, uncertainty_score_chirho, reason_chirho, reviewed_chirho)
     VALUES (?1, ?2, ?3, 0)`
  );

  for (const itemChirho of topChirho) {
    insertChirho.run(
      itemChirho.lemmaIdChirho,
      itemChirho.scoreChirho,
      itemChirho.reasonChirho
    );
  }
  dbChirho.run("COMMIT");

  // Print top 20
  console.log("\n[prioritize-chirho] === TOP 20 REVIEW CANDIDATES ===");
  console.log(
    `  ${"Rank".padEnd(5)} ${"Lemma".padEnd(14)} ${"Gloss".padEnd(25)} ${"Senses".padEnd(8)} ${"Occs".padEnd(8)} ${"Score".padEnd(8)} Reason`
  );
  for (let iChirho = 0; iChirho < Math.min(20, topChirho.length); iChirho++) {
    const itemChirho = topChirho[iChirho];
    console.log(
      `  ${(iChirho + 1).toString().padEnd(5)} ${itemChirho.lemmaIdChirho.padEnd(14)} ${(itemChirho.glossChirho || "").substring(0, 24).padEnd(25)} ${itemChirho.senseCountChirho.toString().padEnd(8)} ${itemChirho.occCountChirho.toString().padEnd(8)} ${itemChirho.scoreChirho.toFixed(3).padEnd(8)} ${itemChirho.reasonChirho}`
    );
  }

  console.log(`\n  Total queued: ${topChirho.length}`);
  dbChirho.close();
  console.log("[prioritize-chirho] Done.");
}

prioritizeReviewChirho();
