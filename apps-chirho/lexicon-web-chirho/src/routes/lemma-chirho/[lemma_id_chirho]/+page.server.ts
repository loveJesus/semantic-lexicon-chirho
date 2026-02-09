// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ platform, params }) => {
  const dbChirho = platform!.env.DB_CHIRHO;
  const lemmaIdChirho = params.lemma_id_chirho;

  const lemmaChirho = await dbChirho
    .prepare(
      `SELECT lemma_id_chirho, language_chirho, gloss_raw_chirho, gloss_clean_chirho,
              pos_chirho, sense_count_chirho, occurrence_count_chirho,
              article_chirho, article_format_chirho,
              gloss_terse_chirho, gloss_readable_chirho
       FROM lemma_entry_chirho WHERE lemma_id_chirho = ?1`
    )
    .bind(lemmaIdChirho)
    .first();

  if (!lemmaChirho) {
    error(404, `Lemma ${lemmaIdChirho} not found`);
  }

  const sensesChirho = await dbChirho
    .prepare(
      `SELECT sense_id_chirho, ordinal_chirho, label_chirho, description_chirho,
              occurrence_count_chirho, community_chirho, ln_domain_chirho, macro32_chirho,
              enriched_chirho
       FROM sense_entry_chirho
       WHERE lemma_id_chirho = ?1
       ORDER BY ordinal_chirho`
    )
    .bind(lemmaIdChirho)
    .all();

  const senseIdsChirho = sensesChirho.results.map(
    (s: Record<string, unknown>) => s.sense_id_chirho
  );

  let glossesChirho: Record<string, unknown>[] = [];
  let refsChirho: Record<string, unknown>[] = [];

  if (senseIdsChirho.length > 0) {
    const placeholdersChirho = senseIdsChirho.map((_: unknown, iChirho: number) => `?${iChirho + 1}`).join(",");

    const glossResultChirho = await dbChirho
      .prepare(
        `SELECT sense_id_chirho, language_code_chirho, glosses_chirho
         FROM sense_gloss_chirho
         WHERE sense_id_chirho IN (${placeholdersChirho})`
      )
      .bind(...senseIdsChirho)
      .all();
    glossesChirho = glossResultChirho.results;

    const refResultChirho = await dbChirho
      .prepare(
        `SELECT sense_id_chirho, book_chirho, chapter_chirho, verse_chirho
         FROM sense_reference_chirho
         WHERE sense_id_chirho IN (${placeholdersChirho})
         ORDER BY sense_id_chirho, book_chirho, chapter_chirho, verse_chirho
         LIMIT 500`
      )
      .bind(...senseIdsChirho)
      .all();
    refsChirho = refResultChirho.results;
  }

  return {
    lemmaChirho,
    sensesChirho: sensesChirho.results,
    glossesChirho,
    refsChirho,
  };
};
