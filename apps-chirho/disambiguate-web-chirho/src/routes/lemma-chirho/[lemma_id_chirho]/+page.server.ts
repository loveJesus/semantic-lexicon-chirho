// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { getDbChirho } from "$lib/server/db-chirho";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const dbChirho = getDbChirho();
  const lemmaIdChirho = params.lemma_id_chirho;

  const lemmaChirho = dbChirho
    .prepare("SELECT id_chirho, gloss_chirho, pos_chirho FROM lemma_chirho WHERE id_chirho = ?")
    .get(lemmaIdChirho);

  const sensesChirho = dbChirho
    .prepare(
      `SELECT s.sense_id_chirho, s.label_chirho, s.description_chirho, s.cluster_method_chirho,
              COUNT(sa.occurrence_id_chirho) as occ_count_chirho
       FROM sense_chirho s
       LEFT JOIN sense_assignment_chirho sa ON s.sense_id_chirho = sa.sense_id_chirho
       WHERE s.lemma_id_chirho = ?
       GROUP BY s.sense_id_chirho
       ORDER BY occ_count_chirho DESC`
    )
    .all(lemmaIdChirho);

  // For each sense, get sample occurrences with glosses and 3-level domains
  const senseDetailsChirho = sensesChirho.map((senseChirho: any) => {
    const occurrencesChirho = dbChirho
      .prepare(
        `SELECT sa.occurrence_id_chirho, w.surface_chirho, w.book_chirho, w.chapter_chirho, w.verse_chirho
         FROM sense_assignment_chirho sa
         JOIN word_chirho w ON sa.occurrence_id_chirho = w.id_chirho
         WHERE sa.sense_id_chirho = ?
         LIMIT 10`
      )
      .all(senseChirho.sense_id_chirho);

    const occWithGlossesChirho = occurrencesChirho.map((occChirho: any) => {
      const glossesChirho = dbChirho
        .prepare(
          `SELECT language_code_chirho, gloss_text_chirho
           FROM gloss_import_chirho
           WHERE word_id_chirho = ?
           AND language_code_chirho IN ('eng', 'spa', 'fra', 'deu', 'arb', 'swa')
           ORDER BY language_code_chirho`
        )
        .all(occChirho.occurrence_id_chirho);
      return { ...occChirho, glossesChirho };
    });

    const domainAssignmentsChirho = dbChirho
      .prepare(
        `SELECT d.name_chirho, d.hierarchy_chirho, da.fit_score_chirho
         FROM domain_assignment_chirho da
         JOIN domain_chirho d ON da.domain_id_chirho = d.domain_id_chirho
         WHERE da.sense_id_chirho = ?
         ORDER BY d.hierarchy_chirho`
      )
      .all(senseChirho.sense_id_chirho);

    return { ...senseChirho, occurrencesChirho: occWithGlossesChirho, domainAssignmentsChirho };
  });

  return { lemmaChirho, senseDetailsChirho, lemmaIdChirho };
};
