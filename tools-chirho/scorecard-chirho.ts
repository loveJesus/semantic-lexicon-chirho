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

/** Build a prototype feature vector for a sense by averaging member occurrence vectors. */
function buildSensePrototypeChirho(
  dbChirho: Database,
  senseIdChirho: number,
  langHashChirho: Map<string, number>
): FeatureVecChirho {
  const prototypeChirho: FeatureVecChirho = new Map();

  const occIdsChirho: any[] = dbChirho
    .query(
      "SELECT occurrence_id_chirho FROM sense_assignment_chirho WHERE sense_id_chirho = ?1"
    )
    .all(senseIdChirho);

  if (occIdsChirho.length === 0) return prototypeChirho;

  const sampleChirho =
    occIdsChirho.length > 30
      ? occIdsChirho
          .filter(
            (_: any, iChirho: number) =>
              iChirho % Math.floor(occIdsChirho.length / 30) === 0
          )
          .slice(0, 30)
      : occIdsChirho;

  const sampleCountChirho = sampleChirho.length;

  const phraseStmtChirho = dbChirho.prepare(
    "SELECT language_code_chirho, phrase_id_chirho FROM gloss_phrase_chirho WHERE occurrence_id_chirho = ?1"
  );

  for (const occChirho of sampleChirho) {
    const widChirho = occChirho.occurrence_id_chirho;
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
  }

  return prototypeChirho;
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
  let avgSenseEntropyChirho = 0;
  const senseCountChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM sense_chirho")
    .get();

  if (senseCountChirho.cnt_chirho > 0) {
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

  // 3. Domain coherence: average intra-domain cosine similarity of sense prototypes
  const domainCountChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM domain_chirho")
    .get();

  let avgDomainCoherenceChirho = 0;

  if (domainCountChirho.cnt_chirho > 0 && senseCountChirho.cnt_chirho > 0) {
    console.log("[scorecard-chirho] Computing domain coherence...");

    // Build language hash
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

    // Get domains with at least 2 senses
    const domainsWithSensesChirho: any[] = dbChirho
      .query(
        `SELECT da.domain_id_chirho, GROUP_CONCAT(da.sense_id_chirho) as sense_ids_chirho
         FROM domain_assignment_chirho da
         GROUP BY da.domain_id_chirho
         HAVING COUNT(*) >= 2`
      )
      .all();

    let totalCoherenceChirho = 0;
    let coherenceCountChirho = 0;

    for (const domChirho of domainsWithSensesChirho) {
      const senseIdsChirho = domChirho.sense_ids_chirho
        .split(",")
        .map(Number)
        .slice(0, 20); // sample up to 20 senses per domain

      if (senseIdsChirho.length < 2) continue;

      // Build prototypes for sampled senses
      const protosChirho: FeatureVecChirho[] = [];
      for (const sidChirho of senseIdsChirho) {
        const protoChirho = buildSensePrototypeChirho(
          dbChirho,
          sidChirho,
          langHashChirho
        );
        if (protoChirho.size > 0) {
          protosChirho.push(protoChirho);
        }
      }

      if (protosChirho.length < 2) continue;

      // Compute average pairwise similarity within domain
      let pairSumChirho = 0;
      let pairCountChirho = 0;
      for (let iChirho = 0; iChirho < protosChirho.length; iChirho++) {
        for (
          let jChirho = iChirho + 1;
          jChirho < protosChirho.length;
          jChirho++
        ) {
          pairSumChirho += cosineSimilarityChirho(
            protosChirho[iChirho],
            protosChirho[jChirho]
          );
          pairCountChirho++;
        }
      }

      if (pairCountChirho > 0) {
        totalCoherenceChirho += pairSumChirho / pairCountChirho;
        coherenceCountChirho++;
      }
    }

    avgDomainCoherenceChirho =
      coherenceCountChirho > 0
        ? totalCoherenceChirho / coherenceCountChirho
        : 0;
  }

  // 4. Separation: average inter-domain centroid distance
  let separationChirho = 0;

  if (domainCountChirho.cnt_chirho > 1 && senseCountChirho.cnt_chirho > 0) {
    console.log("[scorecard-chirho] Computing domain separation...");

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

    // Build centroid for each supersense domain
    const supersensesChirho: any[] = dbChirho
      .query(
        "SELECT domain_id_chirho FROM domain_chirho WHERE level_chirho = 0"
      )
      .all();

    const centroidsChirho: Map<number, FeatureVecChirho> = new Map();

    for (const ssChirho of supersensesChirho) {
      const senseIdsChirho: any[] = dbChirho
        .query(
          "SELECT sense_id_chirho FROM domain_assignment_chirho WHERE domain_id_chirho = ?1 LIMIT 50"
        )
        .all(ssChirho.domain_id_chirho);

      const centroidChirho: FeatureVecChirho = new Map();
      let countChirho = 0;

      for (const sChirho of senseIdsChirho) {
        const protoChirho = buildSensePrototypeChirho(
          dbChirho,
          sChirho.sense_id_chirho,
          langHashChirho
        );
        if (protoChirho.size === 0) continue;
        for (const [keyChirho, valChirho] of protoChirho) {
          centroidChirho.set(
            keyChirho,
            (centroidChirho.get(keyChirho) || 0) + valChirho
          );
        }
        countChirho++;
      }

      if (countChirho > 0) {
        for (const [keyChirho, valChirho] of centroidChirho) {
          centroidChirho.set(keyChirho, valChirho / countChirho);
        }
        centroidsChirho.set(ssChirho.domain_id_chirho, centroidChirho);
      }
    }

    // Compute average inter-centroid distance (1 - cosine similarity)
    const centroidArrayChirho = Array.from(centroidsChirho.values());
    let distSumChirho = 0;
    let distCountChirho = 0;

    for (let iChirho = 0; iChirho < centroidArrayChirho.length; iChirho++) {
      for (
        let jChirho = iChirho + 1;
        jChirho < centroidArrayChirho.length;
        jChirho++
      ) {
        const simChirho = cosineSimilarityChirho(
          centroidArrayChirho[iChirho],
          centroidArrayChirho[jChirho]
        );
        distSumChirho += 1 - simChirho;
        distCountChirho++;
      }
    }

    separationChirho =
      distCountChirho > 0 ? distSumChirho / distCountChirho : 0;
  }

  // 5. Cross-language consistency: H(phrase|domain,lang) vs H(phrase|lang)
  let crossLangConsistencyChirho = 0;

  if (domainCountChirho.cnt_chirho > 0 && senseCountChirho.cnt_chirho > 0) {
    console.log(
      "[scorecard-chirho] Computing cross-language consistency..."
    );

    // H(phrase|lang) — baseline entropy per language
    const baselineRowsChirho: any[] = dbChirho
      .query(
        `SELECT gp.language_code_chirho, gp.phrase_id_chirho, COUNT(*) as freq_chirho
         FROM gloss_phrase_chirho gp
         GROUP BY gp.language_code_chirho, gp.phrase_id_chirho`
      )
      .all();

    const langTotalsBaseChirho = new Map<string, number>();
    const langFreqsBaseChirho = new Map<string, number[]>();

    for (const rowChirho of baselineRowsChirho) {
      const langChirho = rowChirho.language_code_chirho;
      langTotalsBaseChirho.set(
        langChirho,
        (langTotalsBaseChirho.get(langChirho) || 0) + rowChirho.freq_chirho
      );
      const freqsChirho = langFreqsBaseChirho.get(langChirho) || [];
      freqsChirho.push(rowChirho.freq_chirho);
      langFreqsBaseChirho.set(langChirho, freqsChirho);
    }

    let baselineEntropyChirho = 0;
    let baselineCountChirho = 0;
    for (const [langChirho, totalChirho] of langTotalsBaseChirho) {
      const freqsChirho = langFreqsBaseChirho.get(langChirho)!;
      let hChirho = 0;
      for (const fChirho of freqsChirho) {
        const pChirho = fChirho / totalChirho;
        if (pChirho > 0) hChirho -= pChirho * Math.log2(pChirho);
      }
      baselineEntropyChirho += hChirho;
      baselineCountChirho++;
    }
    const avgBaselineChirho =
      baselineCountChirho > 0
        ? baselineEntropyChirho / baselineCountChirho
        : 0;

    // H(phrase|domain,lang) — conditional entropy given domain
    const condRowsChirho: any[] = dbChirho
      .query(
        `SELECT da.domain_id_chirho, gp.language_code_chirho, gp.phrase_id_chirho,
                COUNT(*) as freq_chirho
         FROM domain_assignment_chirho da
         JOIN sense_assignment_chirho sa ON da.sense_id_chirho = sa.sense_id_chirho
         JOIN gloss_phrase_chirho gp ON sa.occurrence_id_chirho = gp.occurrence_id_chirho
         GROUP BY da.domain_id_chirho, gp.language_code_chirho, gp.phrase_id_chirho`
      )
      .all();

    const condTotalsChirho = new Map<string, number>();
    const condFreqsChirho = new Map<string, number[]>();

    for (const rowChirho of condRowsChirho) {
      const keyChirho = `${rowChirho.domain_id_chirho}:${rowChirho.language_code_chirho}`;
      condTotalsChirho.set(
        keyChirho,
        (condTotalsChirho.get(keyChirho) || 0) + rowChirho.freq_chirho
      );
      const freqsChirho = condFreqsChirho.get(keyChirho) || [];
      freqsChirho.push(rowChirho.freq_chirho);
      condFreqsChirho.set(keyChirho, freqsChirho);
    }

    let condEntropyChirho = 0;
    let condCountChirho = 0;
    for (const [keyChirho, totalChirho] of condTotalsChirho) {
      const freqsChirho = condFreqsChirho.get(keyChirho)!;
      let hChirho = 0;
      for (const fChirho of freqsChirho) {
        const pChirho = fChirho / totalChirho;
        if (pChirho > 0) hChirho -= pChirho * Math.log2(pChirho);
      }
      condEntropyChirho += hChirho;
      condCountChirho++;
    }
    const avgCondChirho =
      condCountChirho > 0 ? condEntropyChirho / condCountChirho : 0;

    // Consistency = entropy reduction ratio
    crossLangConsistencyChirho =
      avgBaselineChirho > 0
        ? (avgBaselineChirho - avgCondChirho) / avgBaselineChirho
        : 0;
  }

  // 6. Violation count: senses where POS conflicts with domain
  let violationCountChirho = 0;

  if (domainCountChirho.cnt_chirho > 0 && senseCountChirho.cnt_chirho > 0) {
    console.log("[scorecard-chirho] Counting POS-domain violations...");

    // Define domain names that are typically noun/thing domains
    const nounDomainsChirho = new Set([
      "ARTIFACT",
      "BODY",
      "FOOD",
      "ANIMAL",
      "PLANT",
      "SUBSTANCE",
      "OBJECT",
      "LOCATION",
      "GROUP",
      "PERSON",
    ]);

    // Get senses with their domain and majority POS
    const violationRowsChirho: any[] = dbChirho
      .query(
        `SELECT da.sense_id_chirho, d.name_chirho as domain_name_chirho,
                w.grammar_chirho
         FROM domain_assignment_chirho da
         JOIN domain_chirho d ON da.domain_id_chirho = d.domain_id_chirho
         JOIN sense_assignment_chirho sa ON da.sense_id_chirho = sa.sense_id_chirho
         JOIN word_chirho w ON sa.occurrence_id_chirho = w.id_chirho
         WHERE d.level_chirho = 0 AND w.grammar_chirho IS NOT NULL`
      )
      .all();

    // Group by sense_id and check majority POS vs domain
    const sensePosChirho = new Map<number, Map<string, number>>();
    const senseDomainChirho = new Map<number, string>();

    for (const rowChirho of violationRowsChirho) {
      const sidChirho = rowChirho.sense_id_chirho;
      senseDomainChirho.set(sidChirho, rowChirho.domain_name_chirho);

      if (!sensePosChirho.has(sidChirho)) {
        sensePosChirho.set(sidChirho, new Map());
      }

      // Extract POS from grammar
      const grammarChirho = rowChirho.grammar_chirho || "";
      const componentChirho = grammarChirho.split("|").pop()?.trim() || "";
      const posTokenChirho = componentChirho.split("-")[0] || "";

      const posMapChirho = sensePosChirho.get(sidChirho)!;
      posMapChirho.set(
        posTokenChirho,
        (posMapChirho.get(posTokenChirho) || 0) + 1
      );
    }

    // Check: if majority POS is V (verb) but domain is a noun-domain, that's a violation
    for (const [sidChirho, posMapChirho] of sensePosChirho) {
      const domainNameChirho = senseDomainChirho.get(sidChirho) || "";

      // Find majority POS
      let maxCountChirho = 0;
      let majorityPosChirho = "";
      for (const [posChirho, countChirho] of posMapChirho) {
        if (countChirho > maxCountChirho) {
          maxCountChirho = countChirho;
          majorityPosChirho = posChirho;
        }
      }

      // Verb in a noun-only domain
      if (
        majorityPosChirho === "V" &&
        nounDomainsChirho.has(domainNameChirho.toUpperCase())
      ) {
        violationCountChirho++;
      }
      // Noun in an action-only domain
      if (
        majorityPosChirho === "N" &&
        domainNameChirho.toUpperCase() === "MOTION"
      ) {
        violationCountChirho++;
      }
    }
  }

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
