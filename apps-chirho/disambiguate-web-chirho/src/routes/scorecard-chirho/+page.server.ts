// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { getDbChirho } from "$lib/server/db-chirho";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const dbChirho = getDbChirho();

  const totalWordsChirho = (dbChirho.prepare("SELECT COUNT(*) as c FROM word_chirho").get() as any).c;
  const assignedChirho = (dbChirho.prepare("SELECT COUNT(*) as c FROM sense_assignment_chirho").get() as any).c;
  const coverageChirho = totalWordsChirho > 0 ? (assignedChirho / totalWordsChirho) * 100 : 0;

  const sensesChirho = (dbChirho.prepare("SELECT COUNT(*) as c FROM sense_chirho").get() as any).c;
  const domainsChirho = (dbChirho.prepare("SELECT COUNT(*) as c FROM domain_chirho").get() as any).c;
  const domainAssignmentsChirho = (dbChirho.prepare("SELECT COUNT(*) as c FROM domain_assignment_chirho").get() as any).c;

  // Sense distribution
  const distributionChirho = dbChirho
    .prepare(
      `SELECT sense_count_chirho, COUNT(*) as lemma_count_chirho
       FROM (
         SELECT lemma_id_chirho, COUNT(*) as sense_count_chirho
         FROM sense_chirho
         GROUP BY lemma_id_chirho
       )
       GROUP BY sense_count_chirho
       ORDER BY sense_count_chirho
       LIMIT 20`
    )
    .all() as Record<string, any>[];

  // Domain distribution
  const domainDistChirho = dbChirho
    .prepare(
      `SELECT d.name_chirho, COUNT(da.sense_id_chirho) as cnt_chirho
       FROM domain_chirho d
       LEFT JOIN domain_assignment_chirho da ON d.domain_id_chirho = da.domain_id_chirho
       WHERE d.level_chirho = 0
       GROUP BY d.domain_id_chirho
       ORDER BY cnt_chirho DESC`
    )
    .all() as Record<string, any>[];

  // Review queue stats
  const reviewedChirho = (dbChirho.prepare("SELECT COUNT(*) as c FROM review_queue_chirho WHERE reviewed_chirho = 1").get() as any).c;
  const pendingChirho = (dbChirho.prepare("SELECT COUNT(*) as c FROM review_queue_chirho WHERE reviewed_chirho = 0").get() as any).c;

  return {
    metricsChirho: {
      coverageChirho: Math.round(coverageChirho * 10) / 10,
      totalWordsChirho,
      assignedChirho,
      sensesChirho,
      domainsChirho,
      domainAssignmentsChirho,
      reviewedChirho,
      pendingChirho,
    },
    distributionChirho,
    domainDistChirho,
  };
};
