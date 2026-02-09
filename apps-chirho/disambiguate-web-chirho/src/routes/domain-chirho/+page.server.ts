// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { getDbChirho } from "$lib/server/db-chirho";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
  const dbChirho = getDbChirho();

  // Macro-32 domains (top level)
  const macro32Chirho = dbChirho
    .prepare(
      `SELECT d.domain_id_chirho, d.name_chirho, d.description_chirho,
              (SELECT COUNT(DISTINCT da.sense_id_chirho)
               FROM domain_assignment_chirho da
               WHERE da.domain_id_chirho = d.domain_id_chirho) as sense_count_chirho,
              (SELECT COUNT(*) FROM domain_chirho c
               WHERE c.hierarchy_chirho = 'louw_nida' AND c.parent_id_chirho = d.domain_id_chirho) as ln_count_chirho
       FROM domain_chirho d
       WHERE d.hierarchy_chirho = 'macro32'
       ORDER BY d.name_chirho`
    )
    .all() as Record<string, any>[];

  // Louw-Nida 93 domains (mid level)
  const louwNidaChirho = dbChirho
    .prepare(
      `SELECT d.domain_id_chirho, d.name_chirho, d.description_chirho, d.parent_id_chirho,
              (SELECT COUNT(DISTINCT da.sense_id_chirho)
               FROM domain_assignment_chirho da
               WHERE da.domain_id_chirho = d.domain_id_chirho) as sense_count_chirho,
              (SELECT COUNT(*) FROM domain_chirho c
               WHERE c.hierarchy_chirho = 'community' AND c.parent_id_chirho = d.domain_id_chirho) as community_count_chirho
       FROM domain_chirho d
       WHERE d.hierarchy_chirho = 'louw_nida'
       ORDER BY d.name_chirho`
    )
    .all() as Record<string, any>[];

  // Community fine domains (bottom level)
  const communitiesChirho = dbChirho
    .prepare(
      `SELECT d.domain_id_chirho, d.name_chirho, d.description_chirho, d.parent_id_chirho,
              (SELECT COUNT(DISTINCT da.sense_id_chirho)
               FROM domain_assignment_chirho da
               WHERE da.domain_id_chirho = d.domain_id_chirho) as sense_count_chirho
       FROM domain_chirho d
       WHERE d.hierarchy_chirho = 'community'
       ORDER BY sense_count_chirho DESC`
    )
    .all() as Record<string, any>[];

  return { macro32Chirho, louwNidaChirho, communitiesChirho };
};
