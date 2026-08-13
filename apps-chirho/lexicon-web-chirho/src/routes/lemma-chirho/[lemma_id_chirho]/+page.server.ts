// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ platform, params, url }) => {
  const dbChirho = platform!.env.DB_CHIRHO;
  const lemmaIdChirho = params.lemma_id_chirho;
  const langParamChirho = url.searchParams.get("lang");
  const langChirho = langParamChirho === "spa" ? "spa" : "eng";
  const isSpaChirho = langChirho === "spa";

  const lemmaRowChirho = await dbChirho
    .prepare(
      `SELECT lemma_id_chirho, language_chirho, gloss_raw_chirho, gloss_clean_chirho,
              pos_chirho, sense_count_chirho, occurrence_count_chirho,
              article_chirho, article_format_chirho,
              gloss_terse_chirho, gloss_readable_chirho
       FROM lemma_entry_chirho WHERE lemma_id_chirho = ?1`
    )
    .bind(lemmaIdChirho)
    .first();

  if (!lemmaRowChirho) {
    error(404, `Lemma ${lemmaIdChirho} not found`);
  }

  // Mutable copy so we can overlay Spanish
  const lemmaChirho = { ...lemmaRowChirho } as Record<string, any>;

  // Overlay Spanish lemma translations directly
  if (isSpaChirho) {
    const spaLemmaChirho = await dbChirho
      .prepare(
        `SELECT gloss_terse_chirho, gloss_readable_chirho
         FROM lemma_entry_translation_chirho
         WHERE lemma_id_chirho = ?1 AND language_code_chirho = 'spa'`
      )
      .bind(lemmaIdChirho)
      .first<{ gloss_terse_chirho: string; gloss_readable_chirho: string }>();
    if (spaLemmaChirho) {
      if (spaLemmaChirho.gloss_terse_chirho) {
        lemmaChirho.gloss_terse_chirho = spaLemmaChirho.gloss_terse_chirho;
      }
      if (spaLemmaChirho.gloss_readable_chirho) {
        lemmaChirho.gloss_readable_chirho = spaLemmaChirho.gloss_readable_chirho;
      }
    }
  }

  const sensesResultChirho = await dbChirho
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

  // Mutable copies for Spanish overlay
  const sensesChirho = (sensesResultChirho.results as Record<string, any>[]).map((sChirho) => ({ ...sChirho }));

  const senseIdsChirho = sensesChirho.map(
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

    // Overlay Spanish sense translations directly onto sense objects
    if (isSpaChirho) {
      const spaTransResultChirho = await dbChirho
        .prepare(
          `SELECT sense_id_chirho, label_chirho, enriched_chirho
           FROM sense_entry_translation_chirho
           WHERE sense_id_chirho IN (${placeholdersChirho})
             AND language_code_chirho = 'spa'`
        )
        .bind(...senseIdsChirho)
        .all();

      const spaMapChirho = new Map<number, { labelChirho: string; enrichedChirho: string }>();
      for (const rowChirho of spaTransResultChirho.results as Record<string, any>[]) {
        spaMapChirho.set(rowChirho.sense_id_chirho as number, {
          labelChirho: (rowChirho.label_chirho as string) || "",
          enrichedChirho: (rowChirho.enriched_chirho as string) || "",
        });
      }

      // Overlay Spanish directly onto the sense objects
      for (const senseChirho of sensesChirho) {
        const spaChirho = spaMapChirho.get(senseChirho.sense_id_chirho as number);
        if (spaChirho) {
          if (spaChirho.labelChirho) {
            senseChirho.label_chirho = spaChirho.labelChirho;
          }
          if (spaChirho.enrichedChirho) {
            senseChirho.enriched_chirho = spaChirho.enrichedChirho;
          }
        }
      }
    }
  }

  // Fetch related senses (other lemmas in the same macro32 domain)
  const domainsChirho = sensesChirho
    .map((s: Record<string, unknown>) => s.macro32_chirho)
    .filter((d: unknown): d is string => typeof d === 'string' && d.length > 0);
  const uniqueDomainsChirho = [...new Set(domainsChirho)];

  let relatedSensesChirho: Record<string, unknown>[] = [];
  if (uniqueDomainsChirho.length > 0) {
    const domPlaceholdersChirho = uniqueDomainsChirho.map((_: unknown, iChirho: number) => `?${iChirho + 1}`).join(",");
    const relatedResultChirho = await dbChirho
      .prepare(
        `SELECT s.sense_id_chirho, s.lemma_id_chirho, s.ordinal_chirho, s.label_chirho,
                s.macro32_chirho, s.occurrence_count_chirho, l.pos_chirho
         FROM sense_entry_chirho s
         JOIN lemma_entry_chirho l ON s.lemma_id_chirho = l.lemma_id_chirho
         WHERE s.macro32_chirho IN (${domPlaceholdersChirho})
           AND s.lemma_id_chirho != ?${uniqueDomainsChirho.length + 1}
         ORDER BY s.occurrence_count_chirho DESC
         LIMIT 20`
      )
      .bind(...uniqueDomainsChirho, lemmaIdChirho)
      .all();
    relatedSensesChirho = relatedResultChirho.results;
  }

  return {
    lemmaChirho,
    sensesChirho,
    glossesChirho,
    refsChirho,
    relatedSensesChirho,
    langChirho,
  };
};
