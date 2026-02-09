// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ platform, params }) => {
  const dbChirho = platform!.env.DB_CHIRHO;
  const domainChirho = decodeURIComponent(params.domain_chirho);

  // Determine which hierarchy level this domain belongs to
  // Try macro32 first, then louw_nida, then community
  let hierarchyChirho = "macro32";
  let columnChirho = "macro32_chirho";

  const checkLnChirho = await dbChirho
    .prepare("SELECT COUNT(*) as c FROM sense_entry_chirho WHERE ln_domain_chirho = ?1")
    .bind(domainChirho)
    .first<{ c: number }>();

  const checkMacroChirho = await dbChirho
    .prepare("SELECT COUNT(*) as c FROM sense_entry_chirho WHERE macro32_chirho = ?1")
    .bind(domainChirho)
    .first<{ c: number }>();

  if (checkMacroChirho && checkMacroChirho.c > 0) {
    hierarchyChirho = "macro32";
    columnChirho = "macro32_chirho";
  } else if (checkLnChirho && checkLnChirho.c > 0) {
    hierarchyChirho = "louw_nida";
    columnChirho = "ln_domain_chirho";
  } else {
    const checkCommChirho = await dbChirho
      .prepare("SELECT COUNT(*) as c FROM sense_entry_chirho WHERE community_chirho = ?1")
      .bind(domainChirho)
      .first<{ c: number }>();
    if (checkCommChirho && checkCommChirho.c > 0) {
      hierarchyChirho = "community";
      columnChirho = "community_chirho";
    } else {
      error(404, `Domain "${domainChirho}" not found`);
    }
  }

  // Get all lemmas in this domain with sense counts
  const lemmasChirho = await dbChirho
    .prepare(
      `SELECT s.lemma_id_chirho,
              l.gloss_clean_chirho,
              l.pos_chirho,
              l.occurrence_count_chirho,
              COUNT(*) as sense_in_domain_chirho,
              l.sense_count_chirho
       FROM sense_entry_chirho s
       JOIN lemma_entry_chirho l ON s.lemma_id_chirho = l.lemma_id_chirho
       WHERE s.${columnChirho} = ?1
       GROUP BY s.lemma_id_chirho
       ORDER BY l.occurrence_count_chirho DESC
       LIMIT 200`
    )
    .bind(domainChirho)
    .all();

  // Get child domains if macro32 or louw_nida
  let childrenChirho: Record<string, unknown>[] = [];
  if (hierarchyChirho === "macro32") {
    const childResultChirho = await dbChirho
      .prepare(
        `SELECT ln_domain_chirho as name_chirho, COUNT(*) as sense_count_chirho
         FROM sense_entry_chirho
         WHERE macro32_chirho = ?1 AND ln_domain_chirho IS NOT NULL
         GROUP BY ln_domain_chirho
         ORDER BY sense_count_chirho DESC`
      )
      .bind(domainChirho)
      .all();
    childrenChirho = childResultChirho.results;
  } else if (hierarchyChirho === "louw_nida") {
    const childResultChirho = await dbChirho
      .prepare(
        `SELECT community_chirho as name_chirho, COUNT(*) as sense_count_chirho
         FROM sense_entry_chirho
         WHERE ln_domain_chirho = ?1 AND community_chirho IS NOT NULL
         GROUP BY community_chirho
         ORDER BY sense_count_chirho DESC`
      )
      .bind(domainChirho)
      .all();
    childrenChirho = childResultChirho.results;
  }

  // Total sense count
  const totalChirho = await dbChirho
    .prepare(`SELECT COUNT(*) as c FROM sense_entry_chirho WHERE ${columnChirho} = ?1`)
    .bind(domainChirho)
    .first<{ c: number }>();

  return {
    domainNameChirho: domainChirho,
    hierarchyChirho,
    totalSensesChirho: totalChirho?.c || 0,
    lemmasChirho: lemmasChirho.results,
    childrenChirho,
  };
};
