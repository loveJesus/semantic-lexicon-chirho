-- For God so loved the world that he gave his only begotten Son,
-- that whoever believes in him should not perish but have eternal life.

-- Migration 0001: Semantic Domain Tables
-- All tables for the semantic-chirho pipeline

-- ============================================================
-- Imported Base Facts (from platform-chirho Postgres)
-- ============================================================

CREATE TABLE IF NOT EXISTS word_chirho (
  id_chirho             TEXT PRIMARY KEY,
  verse_id_chirho       TEXT NOT NULL,
  lemma_id_chirho       TEXT NOT NULL,
  surface_chirho        TEXT NOT NULL,
  grammar_chirho        TEXT,
  book_chirho           INTEGER NOT NULL,
  chapter_chirho        INTEGER NOT NULL,
  verse_chirho          INTEGER NOT NULL,
  position_chirho       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_word_lemma_chirho ON word_chirho(lemma_id_chirho);
CREATE INDEX IF NOT EXISTS idx_word_verse_chirho ON word_chirho(verse_id_chirho);

CREATE TABLE IF NOT EXISTS lemma_chirho (
  id_chirho             TEXT PRIMARY KEY,
  gloss_chirho          TEXT,
  pos_chirho            TEXT
);

CREATE TABLE IF NOT EXISTS gloss_import_chirho (
  word_id_chirho        TEXT NOT NULL,
  language_code_chirho  TEXT NOT NULL,
  gloss_text_chirho     TEXT NOT NULL,
  state_chirho          TEXT,
  PRIMARY KEY (word_id_chirho, language_code_chirho)
);
CREATE INDEX IF NOT EXISTS idx_gloss_import_lang_chirho ON gloss_import_chirho(language_code_chirho);

-- ============================================================
-- Dictionary Encoding
-- ============================================================

CREATE TABLE IF NOT EXISTS dictionary_chirho (
  encoded_id_chirho  INTEGER PRIMARY KEY AUTOINCREMENT,
  token_chirho       TEXT NOT NULL UNIQUE,
  type_chirho        TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_dictionary_token_chirho ON dictionary_chirho(token_chirho);

-- ============================================================
-- Gloss Feature Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS gloss_phrase_chirho (
  occurrence_id_chirho  TEXT NOT NULL,
  language_code_chirho  TEXT NOT NULL,
  phrase_id_chirho      INTEGER NOT NULL,
  PRIMARY KEY (occurrence_id_chirho, language_code_chirho)
);
CREATE INDEX IF NOT EXISTS idx_gloss_phrase_lang_chirho ON gloss_phrase_chirho(language_code_chirho);
CREATE INDEX IF NOT EXISTS idx_gloss_phrase_phrase_chirho ON gloss_phrase_chirho(phrase_id_chirho);

CREATE TABLE IF NOT EXISTS gloss_part_chirho (
  occurrence_id_chirho  TEXT NOT NULL,
  language_code_chirho  TEXT NOT NULL,
  position_chirho       INTEGER NOT NULL,
  part_id_chirho        INTEGER NOT NULL,
  PRIMARY KEY (occurrence_id_chirho, language_code_chirho, position_chirho)
);

CREATE TABLE IF NOT EXISTS gloss_head_chirho (
  occurrence_id_chirho  TEXT NOT NULL,
  language_code_chirho  TEXT NOT NULL,
  head_id_chirho        INTEGER NOT NULL,
  PRIMARY KEY (occurrence_id_chirho, language_code_chirho)
);

CREATE TABLE IF NOT EXISTS gloss_alt_chirho (
  occurrence_id_chirho  TEXT NOT NULL,
  language_code_chirho  TEXT NOT NULL,
  alt_index_chirho      INTEGER NOT NULL,
  alt_id_chirho         INTEGER NOT NULL,
  PRIMARY KEY (occurrence_id_chirho, language_code_chirho, alt_index_chirho)
);

-- ============================================================
-- Sense Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS sense_chirho (
  sense_id_chirho       INTEGER PRIMARY KEY AUTOINCREMENT,
  lemma_id_chirho       TEXT NOT NULL,
  label_chirho          TEXT,
  description_chirho    TEXT,
  cluster_method_chirho TEXT,
  created_at_chirho     TEXT DEFAULT (datetime('now')),
  updated_at_chirho     TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sense_lemma_chirho ON sense_chirho(lemma_id_chirho);

CREATE TABLE IF NOT EXISTS sense_assignment_chirho (
  occurrence_id_chirho  TEXT NOT NULL PRIMARY KEY,
  sense_id_chirho       INTEGER NOT NULL,
  confidence_chirho     REAL DEFAULT 1.0,
  source_chirho         TEXT DEFAULT 'auto'
);
CREATE INDEX IF NOT EXISTS idx_sense_assignment_sense_chirho ON sense_assignment_chirho(sense_id_chirho);

-- ============================================================
-- Domain Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS domain_chirho (
  domain_id_chirho      INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id_chirho      INTEGER,
  name_chirho           TEXT NOT NULL,
  level_chirho          INTEGER NOT NULL DEFAULT 0,
  description_chirho    TEXT,
  elicitation_chirho    TEXT,
  created_at_chirho     TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS domain_assignment_chirho (
  sense_id_chirho       INTEGER NOT NULL,
  domain_id_chirho      INTEGER NOT NULL,
  fit_score_chirho      REAL DEFAULT 0.0,
  source_chirho         TEXT DEFAULT 'auto',
  PRIMARY KEY (sense_id_chirho, domain_id_chirho)
);

CREATE TABLE IF NOT EXISTS domain_ancestor_chirho (
  domain_id_chirho      INTEGER NOT NULL,
  ancestor_id_chirho    INTEGER NOT NULL,
  depth_chirho          INTEGER NOT NULL,
  PRIMARY KEY (domain_id_chirho, ancestor_id_chirho)
);

-- ============================================================
-- Proposal & Scoring Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS proposal_chirho (
  proposal_id_chirho    INTEGER PRIMARY KEY AUTOINCREMENT,
  name_chirho           TEXT NOT NULL,
  description_chirho    TEXT,
  created_at_chirho     TEXT DEFAULT (datetime('now')),
  coverage_chirho       REAL,
  coherence_chirho      REAL,
  separation_chirho     REAL,
  cross_lang_score_chirho REAL,
  violation_count_chirho INTEGER
);

CREATE TABLE IF NOT EXISTS proposal_snapshot_chirho (
  proposal_id_chirho    INTEGER NOT NULL,
  sense_id_chirho       INTEGER NOT NULL,
  domain_id_chirho      INTEGER NOT NULL,
  PRIMARY KEY (proposal_id_chirho, sense_id_chirho, domain_id_chirho)
);

-- ============================================================
-- Review Queue (for Phase 4)
-- ============================================================

CREATE TABLE IF NOT EXISTS review_queue_chirho (
  lemma_id_chirho         TEXT NOT NULL PRIMARY KEY,
  uncertainty_score_chirho REAL NOT NULL,
  reason_chirho           TEXT,
  reviewed_chirho         INTEGER DEFAULT 0,
  reviewed_at_chirho      TEXT
);

-- ============================================================
-- Review Log (audit trail for human corrections)
-- ============================================================

CREATE TABLE IF NOT EXISTS review_log_chirho (
  log_id_chirho           INTEGER PRIMARY KEY AUTOINCREMENT,
  action_chirho           TEXT NOT NULL,
  entity_type_chirho      TEXT NOT NULL,
  entity_id_chirho        TEXT NOT NULL,
  old_value_chirho        TEXT,
  new_value_chirho        TEXT,
  created_at_chirho       TEXT DEFAULT (datetime('now'))
);
