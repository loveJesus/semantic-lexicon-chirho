// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { getDbChirho } from "$lib/server/db-chirho";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
  const dbChirho = getDbChirho();
  const pageChirho = parseInt(url.searchParams.get("page") || "1");
  const limitChirho = 50;
  const offsetChirho = (pageChirho - 1) * limitChirho;

  const queueChirho = dbChirho
    .prepare(
      `SELECT rq.lemma_id_chirho, rq.uncertainty_score_chirho, rq.reason_chirho, rq.reviewed_chirho,
              l.gloss_chirho, l.pos_chirho,
              COUNT(DISTINCT s.sense_id_chirho) as sense_count_chirho
       FROM review_queue_chirho rq
       LEFT JOIN lemma_chirho l ON rq.lemma_id_chirho = l.id_chirho
       LEFT JOIN sense_chirho s ON rq.lemma_id_chirho = s.lemma_id_chirho
       WHERE rq.reviewed_chirho = 0
       GROUP BY rq.lemma_id_chirho
       ORDER BY rq.uncertainty_score_chirho DESC
       LIMIT ? OFFSET ?`
    )
    .all(limitChirho, offsetChirho) as Record<string, any>[];

  const totalChirho = (
    dbChirho
      .prepare(
        "SELECT COUNT(*) as c FROM review_queue_chirho WHERE reviewed_chirho = 0"
      )
      .get() as any
  ).c;

  return {
    queueChirho,
    totalChirho,
    pageChirho,
    totalPagesChirho: Math.ceil(totalChirho / limitChirho),
  };
};
