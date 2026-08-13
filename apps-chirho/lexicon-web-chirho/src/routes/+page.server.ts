// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ platform, url }) => {
  const dbChirho = platform!.env.DB_CHIRHO;
  const langParamChirho = url.searchParams.get("lang");
  const langChirho = langParamChirho === "spa" ? "spa" : "eng";
  const isSpaChirho = langChirho === "spa";

  const statsChirho = await dbChirho.batch([
    dbChirho.prepare("SELECT COUNT(*) as c FROM lemma_entry_chirho"),
    dbChirho.prepare("SELECT COUNT(*) as c FROM sense_entry_chirho"),
    dbChirho.prepare("SELECT COUNT(*) as c FROM sense_gloss_chirho"),
    dbChirho.prepare("SELECT COUNT(*) as c FROM sense_reference_chirho"),
  ]);

  // When Spanish mode, pick only lemmas that have Spanish translations
  const randomChirho = isSpaChirho
    ? await dbChirho
        .prepare(
          `SELECT e.lemma_id_chirho, e.gloss_clean_chirho, t.gloss_terse_chirho, e.pos_chirho, e.sense_count_chirho, e.occurrence_count_chirho
           FROM lemma_entry_chirho e
           JOIN lemma_entry_translation_chirho t ON e.lemma_id_chirho = t.lemma_id_chirho AND t.language_code_chirho = 'spa'
           WHERE t.gloss_terse_chirho IS NOT NULL AND length(t.gloss_terse_chirho) > 0
           ORDER BY RANDOM()
           LIMIT 9`
        )
        .all()
    : await dbChirho
        .prepare(
          `SELECT lemma_id_chirho, gloss_clean_chirho, gloss_terse_chirho, pos_chirho, sense_count_chirho, occurrence_count_chirho
           FROM lemma_entry_chirho
           WHERE gloss_terse_chirho IS NOT NULL AND length(gloss_terse_chirho) > 0
           ORDER BY RANDOM()
           LIMIT 9`
        )
        .all();

  const topChirho = isSpaChirho
    ? await dbChirho
        .prepare(
          `SELECT e.lemma_id_chirho, e.gloss_clean_chirho, t.gloss_terse_chirho, e.pos_chirho, e.sense_count_chirho, e.occurrence_count_chirho
           FROM lemma_entry_chirho e
           JOIN lemma_entry_translation_chirho t ON e.lemma_id_chirho = t.lemma_id_chirho AND t.language_code_chirho = 'spa'
           ORDER BY e.occurrence_count_chirho DESC
           LIMIT 8`
        )
        .all()
    : await dbChirho
        .prepare(
          `SELECT lemma_id_chirho, gloss_clean_chirho, gloss_terse_chirho, pos_chirho, sense_count_chirho, occurrence_count_chirho
           FROM lemma_entry_chirho
           ORDER BY occurrence_count_chirho DESC
           LIMIT 8`
        )
        .all();

  // Mutable copies so we can overlay Spanish
  const randomResultsChirho = (randomChirho.results as Record<string, any>[]).map((rChirho) => ({ ...rChirho }));
  const topResultsChirho = (topChirho.results as Record<string, any>[]).map((rChirho) => ({ ...rChirho }));

  // Get first enriched sense for each lemma (random + top combined)
  const allLemmaIdsChirho = [
    ...randomResultsChirho.map((rChirho) => rChirho.lemma_id_chirho as string),
    ...topResultsChirho.map((rChirho) => rChirho.lemma_id_chirho as string),
  ];
  const uniqueIdsChirho = [...new Set(allLemmaIdsChirho)];
  const enrichedMapChirho: Record<string, string> = {};

  for (const idChirho of uniqueIdsChirho) {
    // Fetch enriched sense text (English by default)
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

    // Overlay Spanish enriched sense when in Spanish mode
    if (isSpaChirho) {
      const spaEnrichedChirho = await dbChirho
        .prepare(
          `SELECT st.enriched_chirho
           FROM sense_entry_translation_chirho st
           JOIN sense_entry_chirho se ON se.sense_id_chirho = st.sense_id_chirho
           WHERE se.lemma_id_chirho = ?1
             AND st.language_code_chirho = 'spa'
             AND st.enriched_chirho IS NOT NULL AND length(st.enriched_chirho) > 0
           ORDER BY se.occurrence_count_chirho DESC LIMIT 1`
        )
        .bind(idChirho)
        .first<{ enriched_chirho: string }>();
      if (spaEnrichedChirho?.enriched_chirho) {
        enrichedMapChirho[idChirho] = spaEnrichedChirho.enriched_chirho;
      }
    }
  }

  return {
    countsChirho: {
      lemmasChirho: statsChirho[0].results[0].c as number,
      sensesChirho: statsChirho[1].results[0].c as number,
      glossesChirho: statsChirho[2].results[0].c as number,
      refsChirho: statsChirho[3].results[0].c as number,
    },
    randomLemmasChirho: randomResultsChirho,
    topLemmasChirho: topResultsChirho,
    enrichedMapChirho,
    langChirho,
  };
};
