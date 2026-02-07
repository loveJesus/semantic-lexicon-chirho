// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { getDbChirho } from "$lib/server/db-chirho";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const dbChirho = getDbChirho();

  const domainsChirho = dbChirho
    .prepare(
      `SELECT d.domain_id_chirho, d.name_chirho, d.level_chirho, d.description_chirho,
              d.elicitation_chirho, d.parent_id_chirho,
              COUNT(da.sense_id_chirho) as sense_count_chirho
       FROM domain_chirho d
       LEFT JOIN domain_assignment_chirho da ON d.domain_id_chirho = da.domain_id_chirho
       GROUP BY d.domain_id_chirho
       ORDER BY d.level_chirho, d.name_chirho`
    )
    .all() as Record<string, any>[];

  return { domainsChirho };
};
