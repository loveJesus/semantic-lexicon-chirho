// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ platform }) => {
  const dbChirho = platform!.env.DB_CHIRHO;

  const statsChirho = await dbChirho.batch([
    dbChirho.prepare("SELECT COUNT(*) as c FROM lemma_entry_chirho"),
    dbChirho.prepare("SELECT COUNT(*) as c FROM sense_entry_chirho"),
    dbChirho.prepare("SELECT COUNT(*) as c FROM sense_gloss_chirho"),
    dbChirho.prepare("SELECT COUNT(*) as c FROM sense_reference_chirho"),
  ]);

  const randomChirho = await dbChirho
    .prepare(
      `SELECT lemma_id_chirho, gloss_clean_chirho, gloss_terse_chirho, pos_chirho, sense_count_chirho, occurrence_count_chirho
       FROM lemma_entry_chirho
       WHERE gloss_terse_chirho IS NOT NULL AND length(gloss_terse_chirho) > 0
       ORDER BY RANDOM()
       LIMIT 9`
    )
    .all();

  const topChirho = await dbChirho
    .prepare(
      `SELECT lemma_id_chirho, gloss_clean_chirho, gloss_terse_chirho, pos_chirho, sense_count_chirho, occurrence_count_chirho
       FROM lemma_entry_chirho
       ORDER BY occurrence_count_chirho DESC
       LIMIT 8`
    )
    .all();

  // Get first enriched sense for each lemma (random + top combined)
  const allLemmaIdsChirho = [
    ...(randomChirho.results as Record<string, any>[]).map((rChirho) => rChirho.lemma_id_chirho as string),
    ...(topChirho.results as Record<string, any>[]).map((rChirho) => rChirho.lemma_id_chirho as string),
  ];
  const uniqueIdsChirho = [...new Set(allLemmaIdsChirho)];
  const enrichedMapChirho: Record<string, string> = {};
  for (const idChirho of uniqueIdsChirho) {
    const senseChirho = await dbChirho
      .prepare(
        `SELECT enriched_chirho FROM sense_entry_chirho
         WHERE lemma_id_chirho = ?1
           AND (label_chirho IS NULL OR label_chirho NOT LIKE '[split]%')
           AND enriched_chirho IS NOT NULL AND length(enriched_chirho) > 0
         ORDER BY occurrence_count_chirho DESC LIMIT 1`
      )
      .bind(idChirho)
      .first<{ enriched_chirho: string }>();
    if (senseChirho?.enriched_chirho) {
      enrichedMapChirho[idChirho] = senseChirho.enriched_chirho;
    }
  }

  return {
    countsChirho: {
      lemmasChirho: statsChirho[0].results[0].c as number,
      sensesChirho: statsChirho[1].results[0].c as number,
      glossesChirho: statsChirho[2].results[0].c as number,
      refsChirho: statsChirho[3].results[0].c as number,
    },
    randomLemmasChirho: randomChirho.results,
    topLemmasChirho: topChirho.results,
    enrichedMapChirho,
  };
};
