// For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. — John 3:16 (KJV)

// Workflow: spec-chirho/workflows-chirho/lexicon-read-request-chirho.md
export const macroDomainIndexQueryChirho = `
  SELECT name_chirho, sense_count_chirho
  FROM lexicon_domain_summary_chirho
  WHERE hierarchy_chirho = 'macro32'
  ORDER BY sense_count_chirho DESC, name_chirho DESC
`;

export const louwNidaDomainIndexQueryChirho = `
  SELECT name_chirho, parent_chirho, sense_count_chirho
  FROM lexicon_domain_summary_chirho
  WHERE hierarchy_chirho = 'louw_nida'
  ORDER BY sense_count_chirho DESC, name_chirho, parent_chirho
`;

export const communityDomainIndexQueryChirho = `
  SELECT name_chirho, parent_chirho, sense_count_chirho
  FROM lexicon_domain_summary_chirho
  WHERE hierarchy_chirho = 'community'
  ORDER BY sense_count_chirho DESC, name_chirho, parent_chirho
  LIMIT 200
`;

export const domainResolutionQueryChirho = `
  SELECT hierarchy_chirho, SUM(sense_count_chirho) AS sense_count_chirho
  FROM lexicon_domain_summary_chirho
  WHERE name_chirho = ?1
  GROUP BY hierarchy_chirho
  ORDER BY CASE hierarchy_chirho
    WHEN 'macro32' THEN 1
    WHEN 'louw_nida' THEN 2
    ELSE 3
  END
  LIMIT 1
`;

export const domainLemmaListingQueryChirho = `
  SELECT domain_lemma_chirho.lemma_id_chirho,
         lemma_chirho.gloss_clean_chirho,
         lemma_chirho.pos_chirho,
         lemma_chirho.occurrence_count_chirho,
         domain_lemma_chirho.sense_in_domain_chirho,
         lemma_chirho.sense_count_chirho
  FROM lexicon_domain_lemma_chirho domain_lemma_chirho
  JOIN lemma_entry_chirho lemma_chirho
    ON domain_lemma_chirho.lemma_id_chirho = lemma_chirho.lemma_id_chirho
  WHERE domain_lemma_chirho.hierarchy_chirho = ?1
    AND domain_lemma_chirho.domain_name_chirho = ?2
  ORDER BY domain_lemma_chirho.occurrence_count_chirho DESC,
           domain_lemma_chirho.lemma_id_chirho
  LIMIT 200
`;

export const macroChildrenQueryChirho = `
  SELECT name_chirho, sense_count_chirho
  FROM lexicon_domain_summary_chirho
  WHERE hierarchy_chirho = 'louw_nida'
    AND parent_chirho = ?1
  ORDER BY sense_count_chirho DESC, name_chirho DESC
`;

export const louwNidaChildrenQueryChirho = `
  SELECT name_chirho, sense_count_chirho
  FROM lexicon_domain_summary_chirho
  WHERE hierarchy_chirho = 'community'
    AND parent_chirho = ?1
  ORDER BY sense_count_chirho DESC, name_chirho DESC
`;
