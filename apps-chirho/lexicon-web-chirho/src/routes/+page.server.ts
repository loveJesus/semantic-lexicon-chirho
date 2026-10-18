// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import {
  sampleUniqueOrdinalsChirho,
  type LexiconStatRowChirho,
} from "$lib/server/lexicon-random-chirho";

export const load: PageServerLoad = async ({ platform, url }) => {
  const dbChirho = platform!.env.DB_CHIRHO;
  const langParamChirho = url.searchParams.get("lang");
  const langChirho = langParamChirho === "spa" ? "spa" : "eng";
  const isSpaChirho = langChirho === "spa";

  const statsChirho = await dbChirho
    .prepare(
      `SELECT lemma_count_chirho, sense_count_chirho, gloss_count_chirho,
              reference_count_chirho, english_random_pool_count_chirho,
              spanish_random_pool_count_chirho
       FROM lexicon_stat_chirho
       WHERE singleton_id_chirho = 1`,
    )
    .first<LexiconStatRowChirho>();

  if (statsChirho === null) {
    error(503, "Lexicon statistics are unavailable");
  }

  // Workflow: spec-chirho/workflows-chirho/lexicon-read-request-chirho.md
  const randomPoolCountChirho = isSpaChirho
    ? statsChirho.spanish_random_pool_count_chirho
    : statsChirho.english_random_pool_count_chirho;
  const randomOrdinalsChirho = sampleUniqueOrdinalsChirho(randomPoolCountChirho, 9);
  const randomPlaceholdersChirho = randomOrdinalsChirho
    .map((_ordinalChirho, indexChirho) => `?${indexChirho + 2}`)
    .join(",");

  let randomResultsChirho: Record<string, any>[] = [];
  if (randomOrdinalsChirho.length > 0) {
    const randomChirho = isSpaChirho
      ? await dbChirho
          .prepare(
            `SELECT pool_chirho.ordinal_chirho, lemma_chirho.lemma_id_chirho,
                    lemma_chirho.gloss_clean_chirho, translation_chirho.gloss_terse_chirho,
                    lemma_chirho.pos_chirho, lemma_chirho.sense_count_chirho,
                    lemma_chirho.occurrence_count_chirho
             FROM lemma_random_pool_chirho pool_chirho
             JOIN lemma_entry_chirho lemma_chirho
               ON lemma_chirho.lemma_id_chirho = pool_chirho.lemma_id_chirho
             JOIN lemma_entry_translation_chirho translation_chirho
               ON translation_chirho.lemma_id_chirho = lemma_chirho.lemma_id_chirho
              AND translation_chirho.language_code_chirho = 'spa'
             WHERE pool_chirho.language_code_chirho = ?1
               AND pool_chirho.ordinal_chirho IN (${randomPlaceholdersChirho})`,
          )
          .bind("spa", ...randomOrdinalsChirho)
          .all()
      : await dbChirho
          .prepare(
            `SELECT pool_chirho.ordinal_chirho, lemma_chirho.lemma_id_chirho,
                    lemma_chirho.gloss_clean_chirho, lemma_chirho.gloss_terse_chirho,
                    lemma_chirho.pos_chirho, lemma_chirho.sense_count_chirho,
                    lemma_chirho.occurrence_count_chirho
             FROM lemma_random_pool_chirho pool_chirho
             JOIN lemma_entry_chirho lemma_chirho
               ON lemma_chirho.lemma_id_chirho = pool_chirho.lemma_id_chirho
             WHERE pool_chirho.language_code_chirho = ?1
               AND pool_chirho.ordinal_chirho IN (${randomPlaceholdersChirho})`,
          )
          .bind("eng", ...randomOrdinalsChirho)
          .all();
    const randomByOrdinalChirho = new Map(
      (randomChirho.results as Record<string, any>[]).map((rowChirho) => [
        rowChirho.ordinal_chirho as number,
        rowChirho,
      ]),
    );
    randomResultsChirho = randomOrdinalsChirho.flatMap((ordinalChirho) => {
      const rowChirho = randomByOrdinalChirho.get(ordinalChirho);
      return rowChirho === undefined ? [] : [{ ...rowChirho }];
    });
  }

  const topChirho = isSpaChirho
    ? await dbChirho
        .prepare(
          `SELECT lemma_chirho.lemma_id_chirho, lemma_chirho.gloss_clean_chirho,
                  translation_chirho.gloss_terse_chirho, lemma_chirho.pos_chirho,
                  lemma_chirho.sense_count_chirho, lemma_chirho.occurrence_count_chirho
           FROM lemma_entry_chirho lemma_chirho
           CROSS JOIN lemma_entry_translation_chirho translation_chirho
             ON lemma_chirho.lemma_id_chirho = translation_chirho.lemma_id_chirho
            AND translation_chirho.language_code_chirho = 'spa'
           ORDER BY lemma_chirho.occurrence_count_chirho DESC
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
      lemmasChirho: statsChirho.lemma_count_chirho,
      sensesChirho: statsChirho.sense_count_chirho,
      glossesChirho: statsChirho.gloss_count_chirho,
      refsChirho: statsChirho.reference_count_chirho,
    },
    randomLemmasChirho: randomResultsChirho,
    topLemmasChirho: topResultsChirho,
    enrichedMapChirho,
    langChirho,
  };
};
