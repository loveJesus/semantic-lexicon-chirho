// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import type { PageServerLoad } from "./$types";
import {
  communityDomainIndexQueryChirho,
  louwNidaDomainIndexQueryChirho,
  macroDomainIndexQueryChirho,
} from "$lib/server/lexicon-domain-chirho";

export const load: PageServerLoad = async ({ platform, url }) => {
  const dbChirho = platform!.env.DB_CHIRHO;
  const langChirho = url.searchParams.get("lang") === "spa" ? "spa" : "eng";

  // Workflow: spec-chirho/workflows-chirho/lexicon-read-request-chirho.md
  const [macro32Chirho, lnChirho, communityChirho] = await dbChirho.batch([
    dbChirho.prepare(macroDomainIndexQueryChirho),
    dbChirho.prepare(louwNidaDomainIndexQueryChirho),
    dbChirho.prepare(communityDomainIndexQueryChirho),
  ]);

  return {
    macro32Chirho: macro32Chirho.results,
    lnChirho: lnChirho.results,
    communityChirho: communityChirho.results,
    langChirho,
  };
};
