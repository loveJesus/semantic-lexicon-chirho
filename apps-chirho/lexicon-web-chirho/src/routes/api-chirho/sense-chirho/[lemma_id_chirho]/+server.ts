// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ platform, params, url }) => {
  const dbChirho = platform!.env.DB_CHIRHO;
  const lemmaIdChirho = params.lemma_id_chirho;
  const ordinalChirho = url.searchParams.get("ordinal_chirho");

  const lemmaChirho = await dbChirho
    .prepare(
      `SELECT lemma_id_chirho, language_chirho, pos_chirho,
              gloss_terse_chirho, gloss_readable_chirho,
              sense_count_chirho, occurrence_count_chirho
       FROM lemma_entry_chirho WHERE lemma_id_chirho = ?1`
    )
    .bind(lemmaIdChirho)
    .first();

  if (!lemmaChirho) {
    return json({ errorChirho: "not found" }, { status: 404 });
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

  const allSensesChirho = sensesChirho.results as Record<string, unknown>[];
  const ordValChirho = ordinalChirho ? parseInt(ordinalChirho) : null;

  const targetSenseChirho = ordValChirho
    ? allSensesChirho.find((sChirho) => sChirho.ordinal_chirho === ordValChirho) ?? null
    : allSensesChirho[0] ?? null;

  const otherSensesChirho = allSensesChirho.filter(
    (sChirho) => sChirho !== targetSenseChirho
  );

  // Fetch glosses for the target sense
  let glossesChirho: Record<string, unknown>[] = [];
  if (targetSenseChirho) {
    const glossResultChirho = await dbChirho
      .prepare(
        `SELECT language_code_chirho, glosses_chirho
         FROM sense_gloss_chirho
         WHERE sense_id_chirho = ?1`
      )
      .bind(targetSenseChirho.sense_id_chirho)
      .all();
    glossesChirho = glossResultChirho.results;
  }

  return json({
    lemmaChirho,
    targetSenseChirho,
    otherSensesChirho,
    glossesChirho,
  });
};
