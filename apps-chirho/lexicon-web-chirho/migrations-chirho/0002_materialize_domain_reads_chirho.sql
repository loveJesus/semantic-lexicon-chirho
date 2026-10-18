-- For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. — John 3:16 (KJV)

CREATE TABLE IF NOT EXISTS lexicon_domain_summary_chirho (
  domain_summary_id_chirho INTEGER PRIMARY KEY,
  hierarchy_chirho TEXT NOT NULL CHECK (
    hierarchy_chirho IN ('macro32', 'louw_nida', 'community')
  ),
  name_chirho TEXT NOT NULL,
  parent_chirho TEXT,
  sense_count_chirho INTEGER NOT NULL CHECK (sense_count_chirho >= 0)
);

DELETE FROM lexicon_domain_summary_chirho;

INSERT INTO lexicon_domain_summary_chirho (
  hierarchy_chirho,
  name_chirho,
  parent_chirho,
  sense_count_chirho
)
SELECT
  'macro32',
  macro32_chirho,
  NULL,
  COUNT(*)
FROM sense_entry_chirho
WHERE macro32_chirho IS NOT NULL
GROUP BY macro32_chirho;

INSERT INTO lexicon_domain_summary_chirho (
  hierarchy_chirho,
  name_chirho,
  parent_chirho,
  sense_count_chirho
)
SELECT
  'louw_nida',
  ln_domain_chirho,
  macro32_chirho,
  COUNT(*)
FROM sense_entry_chirho
WHERE ln_domain_chirho IS NOT NULL
GROUP BY ln_domain_chirho, macro32_chirho;

INSERT INTO lexicon_domain_summary_chirho (
  hierarchy_chirho,
  name_chirho,
  parent_chirho,
  sense_count_chirho
)
SELECT
  'community',
  community_chirho,
  ln_domain_chirho,
  COUNT(*)
FROM sense_entry_chirho
WHERE community_chirho IS NOT NULL
GROUP BY community_chirho, ln_domain_chirho;

CREATE INDEX IF NOT EXISTS idx_domain_summary_rank_chirho
  ON lexicon_domain_summary_chirho (
    hierarchy_chirho,
    sense_count_chirho DESC,
    name_chirho,
    parent_chirho
  );

CREATE INDEX IF NOT EXISTS idx_domain_summary_parent_chirho
  ON lexicon_domain_summary_chirho (
    hierarchy_chirho,
    parent_chirho,
    sense_count_chirho DESC,
    name_chirho DESC
  );

CREATE INDEX IF NOT EXISTS idx_domain_summary_name_chirho
  ON lexicon_domain_summary_chirho (
    name_chirho,
    hierarchy_chirho,
    sense_count_chirho
  );

CREATE TABLE IF NOT EXISTS lexicon_domain_lemma_chirho (
  hierarchy_chirho TEXT NOT NULL CHECK (
    hierarchy_chirho IN ('macro32', 'louw_nida', 'community')
  ),
  domain_name_chirho TEXT NOT NULL,
  lemma_id_chirho TEXT NOT NULL,
  occurrence_count_chirho INTEGER NOT NULL,
  sense_in_domain_chirho INTEGER NOT NULL CHECK (sense_in_domain_chirho > 0),
  PRIMARY KEY (hierarchy_chirho, domain_name_chirho, lemma_id_chirho),
  FOREIGN KEY (lemma_id_chirho) REFERENCES lemma_entry_chirho (lemma_id_chirho)
);

DELETE FROM lexicon_domain_lemma_chirho;

INSERT INTO lexicon_domain_lemma_chirho (
  hierarchy_chirho,
  domain_name_chirho,
  lemma_id_chirho,
  occurrence_count_chirho,
  sense_in_domain_chirho
)
SELECT
  'macro32',
  sense_chirho.macro32_chirho,
  sense_chirho.lemma_id_chirho,
  lemma_chirho.occurrence_count_chirho,
  COUNT(*)
FROM sense_entry_chirho sense_chirho
JOIN lemma_entry_chirho lemma_chirho
  ON sense_chirho.lemma_id_chirho = lemma_chirho.lemma_id_chirho
WHERE sense_chirho.macro32_chirho IS NOT NULL
GROUP BY sense_chirho.macro32_chirho, sense_chirho.lemma_id_chirho;

INSERT INTO lexicon_domain_lemma_chirho (
  hierarchy_chirho,
  domain_name_chirho,
  lemma_id_chirho,
  occurrence_count_chirho,
  sense_in_domain_chirho
)
SELECT
  'louw_nida',
  sense_chirho.ln_domain_chirho,
  sense_chirho.lemma_id_chirho,
  lemma_chirho.occurrence_count_chirho,
  COUNT(*)
FROM sense_entry_chirho sense_chirho
JOIN lemma_entry_chirho lemma_chirho
  ON sense_chirho.lemma_id_chirho = lemma_chirho.lemma_id_chirho
WHERE sense_chirho.ln_domain_chirho IS NOT NULL
GROUP BY sense_chirho.ln_domain_chirho, sense_chirho.lemma_id_chirho;

INSERT INTO lexicon_domain_lemma_chirho (
  hierarchy_chirho,
  domain_name_chirho,
  lemma_id_chirho,
  occurrence_count_chirho,
  sense_in_domain_chirho
)
SELECT
  'community',
  sense_chirho.community_chirho,
  sense_chirho.lemma_id_chirho,
  lemma_chirho.occurrence_count_chirho,
  COUNT(*)
FROM sense_entry_chirho sense_chirho
JOIN lemma_entry_chirho lemma_chirho
  ON sense_chirho.lemma_id_chirho = lemma_chirho.lemma_id_chirho
WHERE sense_chirho.community_chirho IS NOT NULL
GROUP BY sense_chirho.community_chirho, sense_chirho.lemma_id_chirho;

CREATE INDEX IF NOT EXISTS idx_domain_lemma_rank_chirho
  ON lexicon_domain_lemma_chirho (
    hierarchy_chirho,
    domain_name_chirho,
    occurrence_count_chirho DESC,
    lemma_id_chirho,
    sense_in_domain_chirho
  );
