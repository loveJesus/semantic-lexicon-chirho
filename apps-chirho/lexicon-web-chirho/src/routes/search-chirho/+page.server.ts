// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ platform, url }) => {
  const dbChirho = platform!.env.DB_CHIRHO;
  const qChirho = url.searchParams.get("q") || "";
  const posChirho = url.searchParams.get("pos") || "";
  const langFilterChirho = url.searchParams.get("lang") || "";
  const uiLangChirho = url.searchParams.get("lang") === "spa" ? "spa" : "eng";
  const isSpaChirho = uiLangChirho === "spa";
  // Distinguish original-language filter from UI lang: use "olang" for heb/arc/grc
  const origLangChirho = langFilterChirho === "heb" || langFilterChirho === "arc" || langFilterChirho === "grc"
    ? langFilterChirho
    : "";
  const pageChirho = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limitChirho = 50;
  const offsetChirho = (pageChirho - 1) * limitChirho;

  const conditionsChirho: string[] = [];
  const paramsChirho: (string | number)[] = [];

  if (qChirho) {
    conditionsChirho.push(
      "(lemma_id_chirho LIKE ?1 OR gloss_clean_chirho LIKE ?1 OR gloss_raw_chirho LIKE ?1)"
    );
    paramsChirho.push(`%${qChirho}%`);
  }
  if (posChirho) {
    conditionsChirho.push(`pos_chirho = ?${paramsChirho.length + 1}`);
    paramsChirho.push(posChirho);
  }
  if (origLangChirho) {
    conditionsChirho.push(`language_chirho = ?${paramsChirho.length + 1}`);
    paramsChirho.push(origLangChirho);
  }

  const whereChirho =
    conditionsChirho.length > 0 ? "WHERE " + conditionsChirho.join(" AND ") : "";

  const countChirho = await dbChirho
    .prepare(`SELECT COUNT(*) as c FROM lemma_entry_chirho ${whereChirho}`)
    .bind(...paramsChirho)
    .first<{ c: number }>();

  const resultsChirho = await dbChirho
    .prepare(
      `SELECT lemma_id_chirho, language_chirho, gloss_clean_chirho, gloss_terse_chirho, pos_chirho, sense_count_chirho, occurrence_count_chirho
       FROM lemma_entry_chirho ${whereChirho}
       ORDER BY occurrence_count_chirho DESC
       LIMIT ?${paramsChirho.length + 1} OFFSET ?${paramsChirho.length + 2}`
    )
    .bind(...paramsChirho, limitChirho, offsetChirho)
    .all();

  // Overlay Spanish translations onto results
  const resultsListChirho = (resultsChirho.results as Record<string, any>[]).map((rChirho) => ({ ...rChirho }));

  if (isSpaChirho && resultsListChirho.length > 0) {
    const idsChirho = resultsListChirho.map((rChirho) => rChirho.lemma_id_chirho as string);
    const placeholdersChirho = idsChirho.map((_: string, iChirho: number) => `?${iChirho + 1}`).join(",");

    const spaTransChirho = await dbChirho
      .prepare(
        `SELECT lemma_id_chirho, gloss_terse_chirho
         FROM lemma_entry_translation_chirho
         WHERE lemma_id_chirho IN (${placeholdersChirho})
           AND language_code_chirho = 'spa'`
      )
      .bind(...idsChirho)
      .all();

    const spaMapChirho = new Map<string, string>();
    for (const rowChirho of spaTransChirho.results as Record<string, any>[]) {
      if (rowChirho.gloss_terse_chirho) {
        spaMapChirho.set(rowChirho.lemma_id_chirho as string, rowChirho.gloss_terse_chirho as string);
      }
    }

    for (const rowChirho of resultsListChirho) {
      const spaGlossChirho = spaMapChirho.get(rowChirho.lemma_id_chirho as string);
      if (spaGlossChirho) {
        rowChirho.gloss_terse_chirho = spaGlossChirho;
      }
    }
  }

  const posListChirho = await dbChirho
    .prepare(
      "SELECT DISTINCT pos_chirho FROM lemma_entry_chirho WHERE pos_chirho IS NOT NULL ORDER BY pos_chirho"
    )
    .all();

  return {
    queryChirho: qChirho,
    posFilterChirho: posChirho,
    langFilterChirho: origLangChirho,
    pageChirho,
    totalChirho: countChirho?.c || 0,
    totalPagesChirho: Math.ceil((countChirho?.c || 0) / limitChirho),
    resultsChirho: resultsListChirho,
    posOptionsChirho: posListChirho.results.map(
      (r: Record<string, unknown>) => r.pos_chirho as string
    ),
    langChirho: uiLangChirho,
  };
};
