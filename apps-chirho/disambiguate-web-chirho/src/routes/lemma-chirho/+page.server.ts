// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { getDbChirho } from "$lib/server/db-chirho";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
  const dbChirho = getDbChirho();
  const searchChirho = url.searchParams.get("q") || "";
  const pageChirho = parseInt(url.searchParams.get("page") || "1");
  const limitChirho = 50;
  const offsetChirho = (pageChirho - 1) * limitChirho;

  let lemmasChirho: any[];
  let totalChirho: number;

  if (searchChirho) {
    lemmasChirho = dbChirho
      .prepare(
        `SELECT l.id_chirho, l.gloss_chirho, l.pos_chirho,
                COUNT(DISTINCT s.sense_id_chirho) as sense_count_chirho,
                COUNT(DISTINCT sa.occurrence_id_chirho) as occ_count_chirho
         FROM lemma_chirho l
         LEFT JOIN sense_chirho s ON l.id_chirho = s.lemma_id_chirho
         LEFT JOIN sense_assignment_chirho sa ON s.sense_id_chirho = sa.sense_id_chirho
         WHERE l.id_chirho LIKE ?1 OR l.gloss_chirho LIKE ?1
         GROUP BY l.id_chirho
         ORDER BY occ_count_chirho DESC
         LIMIT ?2 OFFSET ?3`
      )
      .all(`%${searchChirho}%`, limitChirho, offsetChirho);
    totalChirho = (
      dbChirho
        .prepare(
          "SELECT COUNT(*) as c FROM lemma_chirho WHERE id_chirho LIKE ?1 OR gloss_chirho LIKE ?1"
        )
        .get(`%${searchChirho}%`) as any
    ).c;
  } else {
    lemmasChirho = dbChirho
      .prepare(
        `SELECT l.id_chirho, l.gloss_chirho, l.pos_chirho,
                COUNT(DISTINCT s.sense_id_chirho) as sense_count_chirho,
                COUNT(DISTINCT sa.occurrence_id_chirho) as occ_count_chirho
         FROM lemma_chirho l
         LEFT JOIN sense_chirho s ON l.id_chirho = s.lemma_id_chirho
         LEFT JOIN sense_assignment_chirho sa ON s.sense_id_chirho = sa.sense_id_chirho
         GROUP BY l.id_chirho
         ORDER BY occ_count_chirho DESC
         LIMIT ?1 OFFSET ?2`
      )
      .all(limitChirho, offsetChirho);
    totalChirho = (
      dbChirho.prepare("SELECT COUNT(*) as c FROM lemma_chirho").get() as any
    ).c;
  }

  return {
    lemmasChirho,
    totalChirho,
    pageChirho,
    searchChirho,
    totalPagesChirho: Math.ceil(totalChirho / limitChirho),
  };
};
