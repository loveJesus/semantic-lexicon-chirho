// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ platform, url }) => {
  const dbChirho = platform!.env.DB_CHIRHO;
  const langChirho = url.searchParams.get("lang") === "spa" ? "spa" : "eng";

  // Macro-32 domains with sense counts
  const macro32Chirho = await dbChirho
    .prepare(
      `SELECT macro32_chirho as name_chirho, COUNT(*) as sense_count_chirho
       FROM sense_entry_chirho
       WHERE macro32_chirho IS NOT NULL
       GROUP BY macro32_chirho
       ORDER BY sense_count_chirho DESC`
    )
    .all();

  // Louw-Nida domains with sense counts and parent macro32
  const lnChirho = await dbChirho
    .prepare(
      `SELECT ln_domain_chirho as name_chirho,
              macro32_chirho as parent_chirho,
              COUNT(*) as sense_count_chirho
       FROM sense_entry_chirho
       WHERE ln_domain_chirho IS NOT NULL
       GROUP BY ln_domain_chirho, macro32_chirho
       ORDER BY sense_count_chirho DESC`
    )
    .all();

  // Community domains with sense counts and parent L-N
  const communityChirho = await dbChirho
    .prepare(
      `SELECT community_chirho as name_chirho,
              ln_domain_chirho as parent_chirho,
              COUNT(*) as sense_count_chirho
       FROM sense_entry_chirho
       WHERE community_chirho IS NOT NULL
       GROUP BY community_chirho, ln_domain_chirho
       ORDER BY sense_count_chirho DESC
       LIMIT 200`
    )
    .all();

  return {
    macro32Chirho: macro32Chirho.results,
    lnChirho: lnChirho.results,
    communityChirho: communityChirho.results,
    langChirho,
  };
};
