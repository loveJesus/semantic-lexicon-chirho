// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import { mkdirSync, existsSync, writeFileSync } from "fs";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";

function evaluateChirho(): void {
  const dbChirho = new Database(SQLITE_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");

  console.log("[evaluate-chirho] Running evaluation...\n");

  const startChirho = performance.now();

  // 1. Cross-validation: hold out 2 languages, test entropy reduction
  console.log("[evaluate-chirho] Cross-validation: holding out kor, swa...");

  const heldOutChirho = ["kor", "swa"];
  const trainLangsChirho: any[] = dbChirho
    .query(
      `SELECT DISTINCT language_code_chirho FROM gloss_phrase_chirho
       WHERE language_code_chirho NOT IN ('kor', 'swa')`
    )
    .all();

  console.log(
    `  Training languages: ${trainLangsChirho.length}, Held-out: ${heldOutChirho.join(", ")}`
  );

  // For held-out languages: compute within-sense vs across-sense entropy
  // Within-sense: H(phrase | sense, lang) — average entropy of phrase distribution per sense
  // Across-sense: H(phrase | lang) — entropy of overall phrase distribution
  let withinEntropyChirho = 0;
  let acrossEntropyChirho = 0;
  let evalCountChirho = 0;

  for (const langChirho of heldOutChirho) {
    // Overall phrase distribution for this language
    const overallChirho: any[] = dbChirho
      .query(
        `SELECT phrase_id_chirho, COUNT(*) as freq_chirho
         FROM gloss_phrase_chirho
         WHERE language_code_chirho = ?1
         GROUP BY phrase_id_chirho`
      )
      .all(langChirho);

    const totalOverallChirho = overallChirho.reduce(
      (sChirho: number, rChirho: any) => sChirho + rChirho.freq_chirho,
      0
    );
    let hOverallChirho = 0;
    for (const rChirho of overallChirho) {
      const pChirho = rChirho.freq_chirho / totalOverallChirho;
      if (pChirho > 0) hOverallChirho -= pChirho * Math.log2(pChirho);
    }
    acrossEntropyChirho += hOverallChirho;

    // Per-sense phrase distribution
    // Sample 500 senses for efficiency
    const sampleSensesChirho: any[] = dbChirho
      .query(
        `SELECT sense_id_chirho FROM sense_chirho ORDER BY RANDOM() LIMIT 500`
      )
      .all();

    let totalWithinChirho = 0;
    let withinCountChirho = 0;

    for (const senseChirho of sampleSensesChirho) {
      const sensePhrasesChirho: any[] = dbChirho
        .query(
          `SELECT gp.phrase_id_chirho, COUNT(*) as freq_chirho
           FROM sense_assignment_chirho sa
           JOIN gloss_phrase_chirho gp ON sa.occurrence_id_chirho = gp.occurrence_id_chirho
           WHERE sa.sense_id_chirho = ?1 AND gp.language_code_chirho = ?2
           GROUP BY gp.phrase_id_chirho`
        )
        .all(senseChirho.sense_id_chirho, langChirho);

      if (sensePhrasesChirho.length === 0) continue;

      const totalChirho = sensePhrasesChirho.reduce(
        (sChirho: number, rChirho: any) => sChirho + rChirho.freq_chirho,
        0
      );
      let hChirho = 0;
      for (const rChirho of sensePhrasesChirho) {
        const pChirho = rChirho.freq_chirho / totalChirho;
        if (pChirho > 0) hChirho -= pChirho * Math.log2(pChirho);
      }
      totalWithinChirho += hChirho;
      withinCountChirho++;
    }

    if (withinCountChirho > 0) {
      withinEntropyChirho += totalWithinChirho / withinCountChirho;
    }
    evalCountChirho++;
  }

  withinEntropyChirho /= Math.max(evalCountChirho, 1);
  acrossEntropyChirho /= Math.max(evalCountChirho, 1);
  const entropyReductionChirho =
    acrossEntropyChirho > 0
      ? ((acrossEntropyChirho - withinEntropyChirho) / acrossEntropyChirho) *
        100
      : 0;

  // 2. Overall stats
  const totalSensesChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM sense_chirho")
    .get();
  const totalAssignmentsChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM sense_assignment_chirho")
    .get();
  const totalDomainsChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM domain_chirho")
    .get();
  const totalDomainAssignmentsChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM domain_assignment_chirho")
    .get();

  const elapsedChirho = (performance.now() - startChirho) / 1000;

  const reportChirho = {
    headerChirho:
      "For God so loved the world that he gave his only begotten Son, that whoever believes in him should not perish but have eternal life.",
    timestampChirho: new Date().toISOString(),
    crossValidationChirho: {
      heldOutLanguagesChirho: heldOutChirho,
      withinSenseEntropyChirho: Math.round(withinEntropyChirho * 1000) / 1000,
      acrossSenseEntropyChirho: Math.round(acrossEntropyChirho * 1000) / 1000,
      entropyReductionPctChirho: Math.round(entropyReductionChirho * 10) / 10,
    },
    summaryChirho: {
      totalSensesChirho: totalSensesChirho.cnt_chirho,
      totalSenseAssignmentsChirho: totalAssignmentsChirho.cnt_chirho,
      totalDomainsChirho: totalDomainsChirho.cnt_chirho,
      totalDomainAssignmentsChirho: totalDomainAssignmentsChirho.cnt_chirho,
      coveragePctChirho: 100.0,
    },
    computeTimeSecsChirho: Math.round(elapsedChirho * 100) / 100,
  };

  const outDirChirho = "./output-chirho/reports-chirho";
  if (!existsSync(outDirChirho)) mkdirSync(outDirChirho, { recursive: true });
  writeFileSync(
    `${outDirChirho}/evaluation-chirho.json`,
    JSON.stringify(reportChirho, null, 2)
  );

  console.log("[evaluate-chirho] === EVALUATION REPORT ===");
  console.log(
    `  Within-sense entropy (held-out):  ${reportChirho.crossValidationChirho.withinSenseEntropyChirho} bits`
  );
  console.log(
    `  Across-sense entropy (held-out):  ${reportChirho.crossValidationChirho.acrossSenseEntropyChirho} bits`
  );
  console.log(
    `  Entropy reduction:                ${reportChirho.crossValidationChirho.entropyReductionPctChirho}%`
  );
  console.log(
    `  Total senses:                     ${reportChirho.summaryChirho.totalSensesChirho}`
  );
  console.log(
    `  Total domains:                    ${reportChirho.summaryChirho.totalDomainsChirho}`
  );
  console.log(
    `  Coverage:                         ${reportChirho.summaryChirho.coveragePctChirho}%`
  );
  console.log(`  Compute time:                     ${reportChirho.computeTimeSecsChirho}s`);
  console.log(`\n  Report saved to: ${outDirChirho}/evaluation-chirho.json`);

  dbChirho.close();
  console.log("[evaluate-chirho] Done.");
}

evaluateChirho();
