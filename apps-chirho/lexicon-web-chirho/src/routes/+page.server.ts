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

  const recentChirho = await dbChirho
    .prepare(
      `SELECT lemma_id_chirho, gloss_clean_chirho, pos_chirho, sense_count_chirho, occurrence_count_chirho
       FROM lemma_entry_chirho
       ORDER BY occurrence_count_chirho DESC
       LIMIT 20`
    )
    .all();

  return {
    countsChirho: {
      lemmasChirho: statsChirho[0].results[0].c as number,
      sensesChirho: statsChirho[1].results[0].c as number,
      glossesChirho: statsChirho[2].results[0].c as number,
      refsChirho: statsChirho[3].results[0].c as number,
    },
    topLemmasChirho: recentChirho.results,
  };
};
