// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import { mkdirSync, existsSync, writeFileSync } from "fs";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";

interface ScorecardChirho {
  timestampChirho: string;
  coverageChirho: number;
  avgSenseEntropyChirho: number;
  avgDomainCoherenceChirho: number;
  separationChirho: number;
  crossLangConsistencyChirho: number;
  violationCountChirho: number;
  humanAgreementChirho: number | null;
  detailsChirho: Record<string, any>;
}

function computeScorecardChirho(): ScorecardChirho {
  const dbChirho = new Database(SQLITE_PATH_CHIRHO);
  const startChirho = performance.now();

  // 1. Coverage: % of occurrences with sense assignment
  const totalWordsChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM word_chirho")
    .get();
  const assignedWordsChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM sense_assignment_chirho")
    .get();
  const coverageChirho =
    totalWordsChirho.cnt_chirho > 0
      ? assignedWordsChirho.cnt_chirho / totalWordsChirho.cnt_chirho
      : 0;

  // 2. Average sense entropy (cross-language)
  // For each sense × language: compute entropy of phrase distribution
  let avgSenseEntropyChirho = 0;
  const senseCountChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM sense_chirho")
    .get();

  if (senseCountChirho.cnt_chirho > 0) {
    // Compute entropy for all senses at once using SQL aggregation
    const entropyRowsChirho: any[] = dbChirho
      .query(
        `SELECT sa.sense_id_chirho,
                gp.language_code_chirho,
                gp.phrase_id_chirho,
                COUNT(*) as freq_chirho
         FROM sense_assignment_chirho sa
         JOIN gloss_phrase_chirho gp ON sa.occurrence_id_chirho = gp.occurrence_id_chirho
         GROUP BY sa.sense_id_chirho, gp.language_code_chirho, gp.phrase_id_chirho`
      )
      .all();

    // Compute entropy per (sense, language)
    const senseLangTotalsChirho = new Map<string, number>();
    const senseLangFreqsChirho = new Map<string, number[]>();

    for (const rowChirho of entropyRowsChirho) {
      const keyChirho = `${rowChirho.sense_id_chirho}:${rowChirho.language_code_chirho}`;
      const currentTotalChirho = senseLangTotalsChirho.get(keyChirho) || 0;
      senseLangTotalsChirho.set(
        keyChirho,
        currentTotalChirho + rowChirho.freq_chirho
      );
      const freqsChirho = senseLangFreqsChirho.get(keyChirho) || [];
      freqsChirho.push(rowChirho.freq_chirho);
      senseLangFreqsChirho.set(keyChirho, freqsChirho);
    }

    let totalEntropyChirho = 0;
    let entropyCountChirho = 0;
    for (const [keyChirho, totalChirho] of senseLangTotalsChirho) {
      const freqsChirho = senseLangFreqsChirho.get(keyChirho)!;
      let hChirho = 0;
      for (const fChirho of freqsChirho) {
        const pChirho = fChirho / totalChirho;
        if (pChirho > 0) {
          hChirho -= pChirho * Math.log2(pChirho);
        }
      }
      totalEntropyChirho += hChirho;
      entropyCountChirho++;
    }
    avgSenseEntropyChirho =
      entropyCountChirho > 0 ? totalEntropyChirho / entropyCountChirho : 0;
  }

  // 3. Domain coherence
  const domainCountChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM domain_chirho")
    .get();
  const avgDomainCoherenceChirho = 0; // Will be computed when domains exist

  // 4. Separation (inter-domain distinctness)
  const separationChirho = 0; // Will be computed when domains exist

  // 5. Cross-language consistency
  const crossLangConsistencyChirho = 0; // Will be computed when senses exist

  // 6. Violation count
  const violationCountChirho = 0; // Will be computed when domains exist

  const elapsedChirho = (performance.now() - startChirho) / 1000;

  const scorecardChirho: ScorecardChirho = {
    timestampChirho: new Date().toISOString(),
    coverageChirho,
    avgSenseEntropyChirho,
    avgDomainCoherenceChirho,
    separationChirho,
    crossLangConsistencyChirho,
    violationCountChirho,
    humanAgreementChirho: null,
    detailsChirho: {
      totalWordsChirho: totalWordsChirho.cnt_chirho,
      assignedWordsChirho: assignedWordsChirho.cnt_chirho,
      totalSensesChirho: senseCountChirho.cnt_chirho,
      totalDomainsChirho: domainCountChirho.cnt_chirho,
      computeTimeSecsChirho: Math.round(elapsedChirho * 100) / 100,
    },
  };

  dbChirho.close();
  return scorecardChirho;
}

function mainChirho(): void {
  console.log("[scorecard-chirho] Computing scorecard...");
  const scorecardChirho = computeScorecardChirho();

  console.log("\n[scorecard-chirho] === SCORECARD ===");
  console.log(
    `  Coverage:                ${(scorecardChirho.coverageChirho * 100).toFixed(1)}%`
  );
  console.log(
    `  Avg Sense Entropy:       ${scorecardChirho.avgSenseEntropyChirho.toFixed(3)} bits`
  );
  console.log(
    `  Avg Domain Coherence:    ${scorecardChirho.avgDomainCoherenceChirho.toFixed(3)}`
  );
  console.log(
    `  Separation:              ${scorecardChirho.separationChirho.toFixed(3)}`
  );
  console.log(
    `  Cross-lang Consistency:  ${scorecardChirho.crossLangConsistencyChirho.toFixed(3)}`
  );
  console.log(
    `  Violations:              ${scorecardChirho.violationCountChirho}`
  );
  console.log(
    `  Compute time:            ${scorecardChirho.detailsChirho.computeTimeSecsChirho}s`
  );

  const outDirChirho = "./output-chirho/scorecards-chirho";
  if (!existsSync(outDirChirho)) {
    mkdirSync(outDirChirho, { recursive: true });
  }
  const filenameChirho = `scorecard-${Date.now()}-chirho.json`;
  writeFileSync(
    `${outDirChirho}/${filenameChirho}`,
    JSON.stringify(scorecardChirho, null, 2)
  );
  console.log(`\n  Saved to: ${outDirChirho}/${filenameChirho}`);
}

mainChirho();
