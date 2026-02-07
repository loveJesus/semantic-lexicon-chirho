// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { getDbChirho } from "$lib/server/db-chirho";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const dbChirho = getDbChirho();

  const statsChirho = {
    wordsChirho: (dbChirho.prepare("SELECT COUNT(*) as c FROM word_chirho").get() as any).c,
    lemmasChirho: (dbChirho.prepare("SELECT COUNT(*) as c FROM lemma_chirho").get() as any).c,
    sensesChirho: (dbChirho.prepare("SELECT COUNT(*) as c FROM sense_chirho").get() as any).c,
    domainsChirho: (dbChirho.prepare("SELECT COUNT(*) as c FROM domain_chirho").get() as any).c,
    assignmentsChirho: (dbChirho.prepare("SELECT COUNT(*) as c FROM sense_assignment_chirho").get() as any).c,
    reviewQueueChirho: (dbChirho.prepare("SELECT COUNT(*) as c FROM review_queue_chirho WHERE reviewed_chirho = 0").get() as any).c,
  };

  return { statsChirho };
};
