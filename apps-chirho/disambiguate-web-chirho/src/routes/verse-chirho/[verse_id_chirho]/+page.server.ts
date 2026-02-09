// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { getDbChirho } from "$lib/server/db-chirho";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const dbChirho = getDbChirho();
  const verseIdChirho = params.verse_id_chirho;

  const wordsChirho = dbChirho
    .prepare(
      `SELECT w.id_chirho, w.surface_chirho, w.lemma_id_chirho, w.grammar_chirho,
              w.book_chirho, w.chapter_chirho, w.verse_chirho, w.position_chirho,
              l.gloss_chirho, l.pos_chirho,
              sa.sense_id_chirho, sa.confidence_chirho,
              s.label_chirho as sense_label_chirho
       FROM word_chirho w
       LEFT JOIN lemma_chirho l ON w.lemma_id_chirho = l.id_chirho
       LEFT JOIN sense_assignment_chirho sa ON w.id_chirho = sa.occurrence_id_chirho
       LEFT JOIN sense_chirho s ON sa.sense_id_chirho = s.sense_id_chirho
       WHERE w.verse_id_chirho = ?
       ORDER BY w.position_chirho`
    )
    .all(verseIdChirho) as Record<string, any>[];

  const wordsWithDomainsChirho = wordsChirho.map((wChirho) => {
    const domainsChirho = wChirho.sense_id_chirho
      ? (dbChirho
          .prepare(
            `SELECT d.domain_id_chirho, d.name_chirho, d.level_chirho, d.hierarchy_chirho, da.fit_score_chirho
             FROM domain_assignment_chirho da
             JOIN domain_chirho d ON da.domain_id_chirho = d.domain_id_chirho
             WHERE da.sense_id_chirho = ?
             ORDER BY d.hierarchy_chirho`
          )
          .all(wChirho.sense_id_chirho) as Record<string, any>[])
      : [];

    const glossesChirho = dbChirho
      .prepare(
        `SELECT language_code_chirho, gloss_text_chirho
         FROM gloss_import_chirho
         WHERE word_id_chirho = ?
         AND language_code_chirho IN ('eng', 'spa', 'fra', 'deu', 'arb', 'swa')
         ORDER BY language_code_chirho`
      )
      .all(wChirho.id_chirho) as Record<string, any>[];

    return { ...wChirho, domainsChirho, glossesChirho } as Record<string, any>;
  });

  const refChirho =
    wordsChirho.length > 0
      ? `${wordsChirho[0].book_chirho}:${wordsChirho[0].chapter_chirho}:${wordsChirho[0].verse_chirho}`
      : verseIdChirho;

  return { wordsChirho: wordsWithDomainsChirho as Record<string, any>[], verseIdChirho, refChirho };
};
