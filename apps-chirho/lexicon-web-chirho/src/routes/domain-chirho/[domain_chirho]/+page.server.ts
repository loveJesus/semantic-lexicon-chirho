// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";
import {
  domainLemmaListingQueryChirho,
  domainResolutionQueryChirho,
  louwNidaChildrenQueryChirho,
  macroChildrenQueryChirho,
} from "$lib/server/lexicon-domain-chirho";

export const load: PageServerLoad = async ({ platform, params, url }) => {
  const dbChirho = platform!.env.DB_CHIRHO;
  const domainChirho = decodeURIComponent(params.domain_chirho);
  const langChirho = url.searchParams.get("lang") === "spa" ? "spa" : "eng";
  const isSpaChirho = langChirho === "spa";

  // Workflow: spec-chirho/workflows-chirho/lexicon-read-request-chirho.md
  const resolutionChirho = await dbChirho
    .prepare(domainResolutionQueryChirho)
    .bind(domainChirho)
    .first<{ hierarchy_chirho: string; sense_count_chirho: number }>();
  if (resolutionChirho === null) {
    error(404, `Domain "${domainChirho}" not found`);
  }
  const hierarchyChirho = resolutionChirho.hierarchy_chirho;

  // Get all lemmas in this domain with sense counts
  const lemmasChirho = await dbChirho
    .prepare(domainLemmaListingQueryChirho)
    .bind(hierarchyChirho, domainChirho)
    .all();

  // Get child domains if macro32 or louw_nida
  let childrenChirho: Record<string, unknown>[] = [];
  if (hierarchyChirho === "macro32") {
    const childResultChirho = await dbChirho
      .prepare(macroChildrenQueryChirho)
      .bind(domainChirho)
      .all();
    childrenChirho = childResultChirho.results;
  } else if (hierarchyChirho === "louw_nida") {
    const childResultChirho = await dbChirho
      .prepare(louwNidaChildrenQueryChirho)
      .bind(domainChirho)
      .all();
    childrenChirho = childResultChirho.results;
  }

  // Overlay Spanish glosses when in Spanish mode
  const lemmasListChirho = (lemmasChirho.results as Record<string, any>[]).map((rChirho) => ({ ...rChirho }));

  if (isSpaChirho && lemmasListChirho.length > 0) {
    const idsChirho = lemmasListChirho.map((rChirho) => rChirho.lemma_id_chirho as string);
    const spaMapChirho = new Map<string, string>();
    const chunkSizeChirho = 90; // D1 limit is 100 bind vars

    for (let iChirho = 0; iChirho < idsChirho.length; iChirho += chunkSizeChirho) {
      const chunkChirho = idsChirho.slice(iChirho, iChirho + chunkSizeChirho);
      const placeholdersChirho = chunkChirho.map((_: string, jChirho: number) => `?${jChirho + 1}`).join(",");

      const spaTransChirho = await dbChirho
        .prepare(
          `SELECT lemma_id_chirho, gloss_terse_chirho
           FROM lemma_entry_translation_chirho
           WHERE lemma_id_chirho IN (${placeholdersChirho})
             AND language_code_chirho = 'spa'`
        )
        .bind(...chunkChirho)
        .all();

      for (const rowChirho of spaTransChirho.results as Record<string, any>[]) {
        if (rowChirho.gloss_terse_chirho) {
          spaMapChirho.set(rowChirho.lemma_id_chirho as string, rowChirho.gloss_terse_chirho as string);
        }
      }
    }

    for (const rowChirho of lemmasListChirho) {
      const spaGlossChirho = spaMapChirho.get(rowChirho.lemma_id_chirho as string);
      if (spaGlossChirho) {
        rowChirho.gloss_clean_chirho = spaGlossChirho;
      }
    }
  }

  return {
    domainNameChirho: domainChirho,
    hierarchyChirho,
    totalSensesChirho: resolutionChirho.sense_count_chirho,
    lemmasChirho: lemmasListChirho,
    childrenChirho,
    langChirho,
  };
};
