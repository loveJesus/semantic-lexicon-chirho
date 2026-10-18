-- For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. — John 3:16 (KJV)

CREATE INDEX IF NOT EXISTS idx_sense_macro_ln_chirho
  ON sense_entry_chirho (macro32_chirho, ln_domain_chirho)
  WHERE macro32_chirho IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sense_ln_community_chirho
  ON sense_entry_chirho (ln_domain_chirho, community_chirho)
  WHERE ln_domain_chirho IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sense_community_chirho
  ON sense_entry_chirho (community_chirho)
  WHERE community_chirho IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sense_macro32_occurrence_chirho
  ON sense_entry_chirho (macro32_chirho, occurrence_count_chirho DESC)
  WHERE macro32_chirho IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_lemma_occurrence_chirho
  ON lemma_entry_chirho (occurrence_count_chirho DESC);

CREATE INDEX IF NOT EXISTS idx_lemma_pos_chirho
  ON lemma_entry_chirho (pos_chirho)
  WHERE pos_chirho IS NOT NULL;

CREATE TABLE IF NOT EXISTS lemma_random_pool_chirho (
  language_code_chirho TEXT NOT NULL,
  ordinal_chirho INTEGER NOT NULL,
  lemma_id_chirho TEXT NOT NULL,
  PRIMARY KEY (language_code_chirho, ordinal_chirho),
  UNIQUE (language_code_chirho, lemma_id_chirho),
  FOREIGN KEY (lemma_id_chirho) REFERENCES lemma_entry_chirho (lemma_id_chirho)
);

DELETE FROM lemma_random_pool_chirho;

INSERT INTO lemma_random_pool_chirho (
  language_code_chirho,
  ordinal_chirho,
  lemma_id_chirho
)
SELECT
  'eng',
  ROW_NUMBER() OVER (ORDER BY lemma_id_chirho),
  lemma_id_chirho
FROM lemma_entry_chirho
WHERE gloss_terse_chirho IS NOT NULL
  AND length(gloss_terse_chirho) > 0;

INSERT INTO lemma_random_pool_chirho (
  language_code_chirho,
  ordinal_chirho,
  lemma_id_chirho
)
SELECT
  'spa',
  ROW_NUMBER() OVER (ORDER BY lemma_chirho.lemma_id_chirho),
  lemma_chirho.lemma_id_chirho
FROM lemma_entry_chirho lemma_chirho
JOIN lemma_entry_translation_chirho translation_chirho
  ON lemma_chirho.lemma_id_chirho = translation_chirho.lemma_id_chirho
 AND translation_chirho.language_code_chirho = 'spa'
WHERE translation_chirho.gloss_terse_chirho IS NOT NULL
  AND length(translation_chirho.gloss_terse_chirho) > 0;

CREATE TABLE IF NOT EXISTS lexicon_stat_chirho (
  singleton_id_chirho INTEGER PRIMARY KEY CHECK (singleton_id_chirho = 1),
  lemma_count_chirho INTEGER NOT NULL,
  sense_count_chirho INTEGER NOT NULL,
  gloss_count_chirho INTEGER NOT NULL,
  reference_count_chirho INTEGER NOT NULL,
  english_random_pool_count_chirho INTEGER NOT NULL,
  spanish_random_pool_count_chirho INTEGER NOT NULL,
  refreshed_at_chirho TEXT NOT NULL
);

INSERT INTO lexicon_stat_chirho (
  singleton_id_chirho,
  lemma_count_chirho,
  sense_count_chirho,
  gloss_count_chirho,
  reference_count_chirho,
  english_random_pool_count_chirho,
  spanish_random_pool_count_chirho,
  refreshed_at_chirho
)
VALUES (
  1,
  (SELECT COUNT(*) FROM lemma_entry_chirho),
  (SELECT COUNT(*) FROM sense_entry_chirho),
  (SELECT COUNT(*) FROM sense_gloss_chirho),
  (SELECT COUNT(*) FROM sense_reference_chirho),
  (SELECT COUNT(*) FROM lemma_random_pool_chirho WHERE language_code_chirho = 'eng'),
  (SELECT COUNT(*) FROM lemma_random_pool_chirho WHERE language_code_chirho = 'spa'),
  datetime('now')
)
ON CONFLICT (singleton_id_chirho) DO UPDATE SET
  lemma_count_chirho = excluded.lemma_count_chirho,
  sense_count_chirho = excluded.sense_count_chirho,
  gloss_count_chirho = excluded.gloss_count_chirho,
  reference_count_chirho = excluded.reference_count_chirho,
  english_random_pool_count_chirho = excluded.english_random_pool_count_chirho,
  spanish_random_pool_count_chirho = excluded.spanish_random_pool_count_chirho,
  refreshed_at_chirho = excluded.refreshed_at_chirho;
