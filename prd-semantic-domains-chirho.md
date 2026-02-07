# For God so loved the world that he gave his only begotten Son, that whoever believes in him should not perish but have eternal life.

# PRD: Semantic Domain Mapping Pipeline — semantic-chirho

> **Goal**: Build a data-driven **token → sense → domain** pipeline that assigns every Hebrew/Aramaic/Greek word occurrence in Scripture to semantic senses and hierarchical domains, using multilingual translation signatures from our 38+ parallel glossed translations as the primary evidence signal.

---

## 1. Problem Statement

### 1.1 What We Have
- **platform-chirho** (`../platform-chirho/`): A production Bible translation platform with:
  - ~800K original-language word tokens across 66 books
  - ~13K Hebrew + Greek lemmas with morphological data
  - **38+ target languages** with word-by-word 1:1 glosses (1,249 book×language translation sets)
  - PostgreSQL 16 backend, SvelteKit 2 frontend, 82 Bun/TS CLI tools
  - MCP server for Claude integration

### 1.2 What We Need
- **Semantic senses**: For each lemma, distinguish its different meanings based on context (word-sense disambiguation / sense induction)
- **Semantic domains**: A hierarchical ontology grouping senses into conceptual categories (e.g., PERSON, LOCATION, SPEECH, EMOTION, RELIGIOUS_RITUAL)
- **Mappings**: Every token occurrence → its sense → its domain(s), all traceable to evidence

### 1.3 Why This Matters
- Enables semantic search across all translations ("find all verses about covenant faithfulness")
- Powers translator aids ("this word here means X, not Y — see these parallel passages")
- Produces a freely-licensed, evidence-backed semantic domain system (not dependent on copyrighted Louw-Nida)
- Feeds into the CHI-RHO relational acceleration engine for high-speed proposal testing

### 1.4 Languages Now in Production
We are currently producing glosses in all recommended languages. The full set of 38+ languages provides extraordinary cross-linguistic coverage for translation signature analysis:

| Region | Languages | Codes |
|--------|-----------|-------|
| South Asian | Hindi, Bengali, Urdu, Marathi, Telugu, Tamil, Gujarati, Punjabi | hin, ben, urd, mar, tel, tam, guj, pnb |
| East Asian | Mandarin, Cantonese, Japanese, Korean, Vietnamese, Thai, Burmese | zho, yue, jpn, kor, vie, tha, mya |
| Southeast Asian | Indonesian, Javanese, Tagalog | ind, jav, tgl |
| European | Spanish, Portuguese, French, German, Italian, Dutch, Polish, Ukrainian, Russian, Romanian, Czech, Hungarian, Greek, Swedish, Norwegian, Danish | spa, por, fra, deu, ita, nld, pol, ukr, rus, ron, ces, hun, ell, swe, nor, dan |
| Middle Eastern | Arabic, Hebrew, Turkish, Persian | arb, heb, tur, fas |
| African | Swahili, Hausa, Yoruba, Amharic | swa, hau, yor, amh |
| Caribbean | Haitian Creole | hat |

**Key insight**: Translation divergence across these linguistically diverse families is one of the strongest signals of polysemy. When the same Hebrew lemma maps to different glosses across language families, that almost certainly indicates distinct senses.

---

## 2. Architecture Overview

### 2.1 Local-First with SQLite

This project uses **SQLite** as its local database (`.gitignore`d), not Postgres directly. We **read from** platform-chirho's Postgres to extract base facts, then store all derived features, senses, and domains in a local SQLite DB. This keeps semantic-chirho self-contained, fast for iteration, and portable.

- **Read source**: platform-chirho Postgres (Docker port 5435) — connection string in `.env-chirho`
- **Write target**: `data-chirho/semantic-chirho.db` (SQLite, .gitignore'd)
- **Config**: `.env-chirho` (local, .gitignore'd) holds `PLATFORM_DB_URL_CHIRHO`, `ANTHROPIC_API_KEY_CHIRHO`, `LAMBDA_API_KEY_CHIRHO`, etc.

### 2.2 Language Strategy: Bun/TS + Rust

- **Bun/TS**: Orchestration, CLI tools, LLM calls, data import/export, glue code
- **Rust**: Hot-path computation where speed matters — clustering (HDBSCAN), similarity matrices, entropy computation, transitive closure, feature vector construction over 30M+ rows. Compiled to native binaries, called from Bun via `Bun.spawn()` or as WASM where convenient.

### 2.3 Three-Layer Model

```
Layer 0: BASE FACTS (read from platform-chirho Postgres → imported into local SQLite)
  Token(o) → book, chapter, verse, position, source_lang, surface, lemma, morph, POS
  Align(o, target_lang, gloss) → word-level alignment (already 1:1 by design)

Layer 1: DERIVED FEATURES (computed by this project, stored in SQLite)
  GlossPhrase(o, lang, phrase_id)     — dictionary-encoded whole phrase
  GlossPart(o, lang, position, part_id) — split on dash
  GlossAlt(o, lang, alt_id)            — split on pipe (alternatives)
  GlossHead(o, lang, head_id)          — deterministic head selection
  TranslationSignature(o)              — sparse multilingual feature vector

Layer 2: SEMANTIC LAYER (the deliverable, stored in SQLite)
  SenseOf(o, sense_id)                 — occurrence → sense (clustering output)
  DomainOf(sense_id, domain_id)        — sense → domain (assignment output)
  Parent(domain_id, parent_domain_id)  — domain hierarchy
  Ancestor(domain_id, ancestor_id)     — transitive closure
```

### 2.4 System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    semantic-chirho Pipeline                       │
├──────────────┬──────────────┬──────────────┬────────────────────┤
│  Phase 1     │  Phase 2     │  Phase 3     │  Phase 4           │
│  Fact Base   │  Sense       │  Domain      │  Human Review      │
│  + Scoring   │  Induction   │  Ontology    │  + Active Learning │
│  Kernels     │  Loop        │  + Assign    │                    │
│  (Bun/TS)    │ (Rust+Bun)   │ (Rust+Bun)   │  (SvelteKit)      │
└──────┬───────┴──────┬───────┴──────┬───────┴────────┬───────────┘
       │              │              │                │
       ▼              ▼              ▼                ▼
┌──────────────────────────────────────────────────────────────────┐
│  data-chirho/semantic-chirho.db (SQLite, local, .gitignore'd)    │
│  30M+ feature rows │ senses │ domains │ proposals │ scorecards   │
└──────────────────────────────┬───────────────────────────────────┘
                               │ initial import
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                    platform-chirho Postgres (read-only source)    │
│  800K words │ 13K lemmas │ 38+ languages │ 1:1 glosses           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Model: SQLite Tables

All tables live in `data-chirho/semantic-chirho.db` (local SQLite, .gitignore'd). Base facts are imported once from platform-chirho Postgres; everything else is computed locally. All identifiers follow Chirho suffix convention.

### 3.0 Imported Base Facts (from platform-chirho Postgres)

```sql
-- For God so loved the world that he gave his only begotten Son,
-- that whoever believes in him should not perish but have eternal life.

-- Snapshot of platform-chirho word table (read-only reference)
CREATE TABLE word_chirho (
  id_chirho             TEXT PRIMARY KEY,   -- e.g. '0100100101'
  verse_id_chirho       TEXT NOT NULL,      -- e.g. '01001001'
  lemma_id_chirho       TEXT NOT NULL,      -- e.g. 'H7225'
  surface_chirho        TEXT NOT NULL,      -- original script surface form
  grammar_chirho        TEXT,               -- morphological tags
  book_chirho           INTEGER NOT NULL,
  chapter_chirho        INTEGER NOT NULL,
  verse_chirho          INTEGER NOT NULL,
  position_chirho       INTEGER NOT NULL
);

-- Snapshot of platform-chirho gloss data (one row per word×language)
CREATE TABLE gloss_import_chirho (
  word_id_chirho        TEXT NOT NULL,
  language_code_chirho  TEXT NOT NULL,
  gloss_text_chirho     TEXT NOT NULL,
  state_chirho          TEXT,               -- 'APPROVED' or 'UNAPPROVED'
  PRIMARY KEY (word_id_chirho, language_code_chirho)
);

-- Lemma reference
CREATE TABLE lemma_chirho (
  id_chirho             TEXT PRIMARY KEY,
  gloss_chirho          TEXT,
  pos_chirho            TEXT                -- part of speech
);
```

### 3.1 Dictionary Encoding

```sql
CREATE TABLE dictionary_chirho (
  encoded_id_chirho  INTEGER PRIMARY KEY AUTOINCREMENT,
  token_chirho       TEXT NOT NULL UNIQUE,
  type_chirho        TEXT NOT NULL  -- 'phrase', 'part', 'head', 'alt', 'domain_name'
);
CREATE INDEX idx_dictionary_token_chirho ON dictionary_chirho(token_chirho);
```

### 3.2 Gloss Feature Tables

```sql
-- GlossPhrase: one row per (occurrence, language) — the whole gloss string, dictionary-encoded
CREATE TABLE gloss_phrase_chirho (
  occurrence_id_chirho  TEXT NOT NULL REFERENCES word_chirho(id_chirho),
  language_code_chirho  TEXT NOT NULL,
  phrase_id_chirho      INTEGER NOT NULL REFERENCES dictionary_chirho(encoded_id_chirho),
  PRIMARY KEY (occurrence_id_chirho, language_code_chirho)
);

-- GlossPart: split on dash separator, multiple rows per occurrence×language
CREATE TABLE gloss_part_chirho (
  occurrence_id_chirho  TEXT NOT NULL,
  language_code_chirho  TEXT NOT NULL,
  position_chirho       INTEGER NOT NULL,  -- 0-indexed part position
  part_id_chirho        INTEGER NOT NULL REFERENCES dictionary_chirho(encoded_id_chirho),
  PRIMARY KEY (occurrence_id_chirho, language_code_chirho, position_chirho)
);

-- GlossHead: deterministic head of each compound gloss (last part by default)
CREATE TABLE gloss_head_chirho (
  occurrence_id_chirho  TEXT NOT NULL,
  language_code_chirho  TEXT NOT NULL,
  head_id_chirho        INTEGER NOT NULL REFERENCES dictionary_chirho(encoded_id_chirho),
  PRIMARY KEY (occurrence_id_chirho, language_code_chirho)
);

-- GlossAlt: split on pipe for alternatives/uncertainty
CREATE TABLE gloss_alt_chirho (
  occurrence_id_chirho  TEXT NOT NULL,
  language_code_chirho  TEXT NOT NULL,
  alt_index_chirho      INTEGER NOT NULL,
  alt_id_chirho         INTEGER NOT NULL REFERENCES dictionary_chirho(encoded_id_chirho),
  PRIMARY KEY (occurrence_id_chirho, language_code_chirho, alt_index_chirho)
);
```

### 3.3 Sense Tables

```sql
-- Induced senses (one per distinct meaning of a lemma)
CREATE TABLE sense_chirho (
  sense_id_chirho       INTEGER PRIMARY KEY AUTOINCREMENT,
  lemma_id_chirho       TEXT NOT NULL,
  label_chirho          TEXT,           -- human-readable label
  description_chirho    TEXT,
  cluster_method_chirho TEXT,           -- 'hdbscan', 'agglomerative', 'manual'
  created_at_chirho     TEXT DEFAULT (datetime('now')),
  updated_at_chirho     TEXT DEFAULT (datetime('now'))
);

-- Token → Sense assignment
CREATE TABLE sense_assignment_chirho (
  occurrence_id_chirho  TEXT NOT NULL PRIMARY KEY REFERENCES word_chirho(id_chirho),
  sense_id_chirho       INTEGER NOT NULL REFERENCES sense_chirho(sense_id_chirho),
  confidence_chirho     REAL DEFAULT 1.0,
  source_chirho         TEXT DEFAULT 'auto'  -- 'auto', 'human', 'llm_proposed'
);
CREATE INDEX idx_sense_assignment_sense_chirho ON sense_assignment_chirho(sense_id_chirho);
```

### 3.4 Domain Tables

```sql
-- Hierarchical domain ontology (two layers: supersenses + fine domains)
CREATE TABLE domain_chirho (
  domain_id_chirho      INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id_chirho      INTEGER REFERENCES domain_chirho(domain_id_chirho),
  name_chirho           TEXT NOT NULL,
  level_chirho          INTEGER NOT NULL DEFAULT 0,  -- 0=supersense, 1=fine
  description_chirho    TEXT,
  elicitation_chirho    TEXT,
  created_at_chirho     TEXT DEFAULT (datetime('now'))
);

-- Sense → Domain assignment (multi-label)
CREATE TABLE domain_assignment_chirho (
  sense_id_chirho       INTEGER NOT NULL REFERENCES sense_chirho(sense_id_chirho),
  domain_id_chirho      INTEGER NOT NULL REFERENCES domain_chirho(domain_id_chirho),
  fit_score_chirho      REAL DEFAULT 0.0,
  source_chirho         TEXT DEFAULT 'auto',
  PRIMARY KEY (sense_id_chirho, domain_id_chirho)
);

-- Materialized ancestor closure for fast hierarchy queries
CREATE TABLE domain_ancestor_chirho (
  domain_id_chirho      INTEGER NOT NULL,
  ancestor_id_chirho    INTEGER NOT NULL,
  depth_chirho          INTEGER NOT NULL,
  PRIMARY KEY (domain_id_chirho, ancestor_id_chirho)
);
```

### 3.5 Proposal & Scoring Tables

```sql
-- Versioned proposals for A/B comparison
CREATE TABLE proposal_chirho (
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

-- Snapshot: which sense/domain assignments belong to which proposal
CREATE TABLE proposal_snapshot_chirho (
  proposal_id_chirho    INTEGER NOT NULL REFERENCES proposal_chirho(proposal_id_chirho),
  sense_id_chirho       INTEGER NOT NULL,
  domain_id_chirho      INTEGER NOT NULL,
  PRIMARY KEY (proposal_id_chirho, sense_id_chirho, domain_id_chirho)
);
```

---

## 4. Implementation Phases

### Phase 1: Build the Fact Base + Fast Evaluation Kernels

**Goal**: Ingest all existing gloss data from platform-chirho into the feature tables. Implement scorecard queries.

#### Tasks

1. **Import base facts from platform-chirho Postgres → local SQLite**
   - Create `import-base-facts-chirho.ts` — Bun/TS script that:
     - Reads `PLATFORM_DB_URL_CHIRHO` from `.env-chirho`
     - Connects to platform-chirho Postgres (Docker port 5435)
     - Queries `word`, `lemma`, `language`, `phrase`, `phrase_word`, `gloss` tables
     - Writes snapshots to local SQLite: `word_chirho`, `lemma_chirho`, `gloss_import_chirho`
   - This is the **only** tool that touches Postgres; everything else works on local SQLite

2. **Run SQLite schema migrations**
   - Create `migrations-chirho/0001-semantic-tables-chirho.sql` with all tables from Section 3
   - Apply to `data-chirho/semantic-chirho.db` via `bun run migrate-chirho`

3. **Materialize GlossPhrase / GlossPart / GlossHead / GlossAlt**
   - Create `materialize-gloss-features-chirho.ts`
   - For each row in `gloss_import_chirho`: read the gloss text
   - Normalize Unicode (NFKC), normalize dashes (all → ASCII `-`)
   - Dictionary-encode the full phrase → `gloss_phrase_chirho`
   - Split on `-` → `gloss_part_chirho` (one row per part, with position)
   - Pick last part as head → `gloss_head_chirho`
   - Split on `|` (if present) → `gloss_alt_chirho`
   - Expected volume: ~800K words × 38 languages ≈ ~30M rows in `gloss_phrase_chirho`
   - Use SQLite WAL mode + batch inserts for performance

4. **Implement scorecard queries**
   - Create `scorecard-chirho.ts` with these SQL/query functions:
     - `coverage_chirho()`: % of occurrences with sense assignment
     - `entropy_per_sense_chirho(sense_id, language_code)`: translation phrase entropy within a sense cluster
     - `coherence_per_domain_chirho(domain_id)`: aggregate intra-domain similarity
     - `separation_chirho()`: inter-domain distinctness
     - `violation_count_chirho(proposal_id)`: constraint violations (hierarchy, POS, etc.)

5. **Gloss Style Validation**
   - Create `validate-glosses-chirho.ts` — scan all glosses and flag:
     - Mixed dash/pipe usage
     - Grammar encoded in gloss phrases (tense markers, articles that should be separate)
     - Inconsistent normalization
   - Output report for manual review

#### Acceptance Criteria
- All 38+ languages' gloss data materialized into feature tables
- Dictionary has ~50K–200K unique encoded tokens
- Scorecard queries return results in <5s for any lemma
- Gloss validation report generated

---

### Phase 2: Sense Induction Loop

**Goal**: For each lemma, cluster its occurrences into senses using translation signatures.

#### Tasks

1. **Build occurrence feature vectors** (Rust: `crates-chirho/cluster-chirho/`)
   - Bun orchestrator: `tools-chirho/build-features-chirho.ts` calls Rust binary
   - Rust binary reads from SQLite, constructs sparse feature vectors per occurrence:
     - Phrase features `(lang, phrase_id)` — weight 3.0
     - Head features `(lang, head_id)` — weight 2.0
     - Part features `(lang, part_id)` — weight 1.0
   - Store as dense integer arrays (dictionary-encoded) for clustering
   - Uses `rayon` for parallel iteration across lemmas on M4 cores

2. **Implement clustering per lemma** (Rust: `crates-chirho/cluster-chirho/`)
   - Bun orchestrator: `tools-chirho/cluster-senses-chirho.ts` calls Rust binary
   - For each lemma with >1 occurrence:
     - Collect all occurrence feature vectors
     - Compute pairwise cosine similarity (M4 GPU via Metal if matrix is large enough)
     - Run HDBSCAN (via `linfa-clustering` or custom impl)
     - Output candidate sense clusters
   - For lemmas with ≤5 occurrences: start with 1 sense per lemma (defer to Phase 4 human review)

3. **Entropy-based validation**
   - Create `validate-senses-chirho.ts`
   - For each candidate sense cluster:
     - Compute per-language phrase entropy `H(phrase | sense, lang)`
     - If entropy > threshold in ≥3 languages → flag for splitting
     - If two clusters have near-identical distributions → flag for merging
   - Loop: split/merge → recluster → revalidate until stable

4. **Persist sense assignments**
   - Write `SenseOf(occurrence, sense_id)` to `sense_assignment_chirho`
   - Write sense metadata to `sense_chirho`
   - Tag with `cluster_method_chirho` and confidence

5. **LLM-assisted sense labeling**
   - Create `label-senses-chirho.ts`
   - For each sense cluster: gather top-k representative occurrences + their glosses in 5-6 diverse languages
   - Prompt Claude to generate a concise sense label and description
   - Store in `sense_chirho.label_chirho` and `sense_chirho.description_chirho`
   - Mark as `source = 'llm_proposed'` (not final until human review)

#### Acceptance Criteria
- Every lemma with >1 occurrence has sense clusters
- Cross-language entropy within clusters is measurably lower than across clusters
- Sense labels exist for all clusters (LLM-generated, pending review)
- Statistics: expected ~20K–40K total senses from ~13K lemmas

---

### Phase 3: Domain Ontology + Assignment

**Goal**: Build a hierarchical domain ontology and assign each sense to domain(s).

#### Tasks

1. **Seed domain hierarchy**
   - Create `seed-domains-chirho.ts`
   - Option A: Start from SIL's ~1800 semantic domains (CC BY-SA 4.0) as initial hierarchy
   - Option B: Start from a hand-curated set of ~20 supersenses + Bible-specific fine domains
   - Recommended: **Hybrid** — use SIL supersenses as Layer 0, then data-driven fine domains
   - Insert into `domain_chirho` table
   - Compute and insert transitive closure into `domain_ancestor_chirho`

2. **Build sense-to-sense similarity graph**
   - Create `sense-similarity-chirho.ts`
   - For each pair of senses: compute similarity based on their translation signature distributions
   - Build a weighted graph of sense similarities

3. **Community detection → data-driven domains**
   - Create `detect-domains-chirho.ts`
   - Run community detection (Louvain/Leiden) on sense similarity graph
   - Each community becomes a candidate fine domain
   - Hierarchy: nest fine domains under the nearest supersense
   - This produces a **data-driven domain proposal**

4. **Assign senses to domains**
   - Create `assign-domains-chirho.ts`
   - For each sense: compute fit score against each candidate domain
   - Evidence signals:
     - Similarity between sense translation distribution and domain prototype
     - Frame/role patterns (if available)
     - POS constraints (events → event domains, etc.)
   - Write to `domain_assignment_chirho`

5. **Apply constraints + repair**
   - Domain hierarchy closure: membership implies parent membership
   - POS constraints: validate domain-POS compatibility
   - Greedy repair for violations

6. **Score the proposal**
   - Run full scorecard from Phase 1
   - Store in `proposal_chirho`
   - Compare against baseline (e.g., random assignment, SIL-only assignment)

7. **LLM-assisted domain naming/description**
   - For each domain: gather member senses + representative glosses
   - Prompt Claude to generate domain name, description, and elicitation question
   - Store in `domain_chirho` fields

#### Acceptance Criteria
- Domain hierarchy with 15-30 supersenses and 200-800 fine domains
- Every sense assigned to ≥1 domain
- Scorecard shows measurable improvement over random baseline
- Constraint violation count < 5% of assignments
- Named and described domains ready for human review

---

### Phase 4: Disambiguation Tools + Human Review + Active Learning

**Goal**: Build visual tools for human disambiguation and review, prioritizing the highest-uncertainty items.

#### 4.1 Disambiguation UI Options

We need interactive tools for scholars/translators to work directly with the SQLite data. Three complementary approaches:

**Option A: SvelteKit 2 Web App** (`apps-chirho/disambiguate-web-chirho/`)
- SvelteKit 2 + Svelte 5 app that reads/writes the local SQLite via API routes
- Best for: collaborative review, shareable, familiar web UI
- Stack: SvelteKit 2, `better-sqlite3`, Tailwind, deployed locally or on Cloudflare

**Option B: Slint Desktop App** (`apps-chirho/disambiguate-desktop-chirho/`)
- Rust + Slint native desktop app compiled to WASM or native binary
- Direct SQLite access via `rusqlite` — zero network latency
- Best for: single-user power workflow, offline use, M4-native performance
- Can compile to WASM for embedding in web if needed

**Option C: SvelteKit + WASM Hybrid**
- SvelteKit frontend with Rust/WASM modules for heavy compute (similarity, clustering)
- Best of both: web accessibility + Rust speed in the browser
- The Rust `cluster-chirho` and `similarity-chirho` crates compile to WASM via `wasm-pack`

**Recommended**: Start with **Option A** (SvelteKit web) for rapid iteration, add **Option B** (Slint desktop) for power users. Rust WASM modules can be shared between both.

#### 4.2 Disambiguation Views

All UIs should provide these core views:

| View | Purpose | Key Interactions |
|------|---------|-----------------|
| **Lemma Explorer** (`/lemma-chirho/[lemma_id_chirho]`) | Show all occurrences of a lemma grouped by sense cluster | Split/merge clusters, reassign occurrences |
| **Sense Detail** (`/sense-chirho/[sense_id_chirho]`) | Show one sense cluster with all evidence (glosses in 38+ langs, contexts) | Approve, edit label, flag for review |
| **Domain Browser** (`/domain-chirho/[domain_id_chirho]`) | Show domain hierarchy with member senses | Reassign senses, split/merge domains |
| **Review Queue** (`/review-chirho/queue-chirho`) | Active-learning ranked list of uncertain lemmas/senses | Work through highest-uncertainty items first |
| **Scorecard Dashboard** (`/scorecard-chirho`) | Live proposal metrics (coverage, entropy, coherence) | Compare proposals side-by-side |
| **Verse Context** (`/verse-chirho/[verse_id_chirho]`) | Show a verse with all words, their senses, and domains highlighted | In-context disambiguation |

#### 4.3 Active Learning Prioritization

1. **Active learning prioritization**
   - Create `prioritize-review-chirho.ts`
   - Rank senses/lemmas by uncertainty:
     - High cross-language entropy (sense boundary unclear)
     - Low cluster confidence
     - Multiple equally-plausible domain assignments
   - Output prioritized review queue to SQLite `review_queue_chirho` table

2. **Feedback loop**
   - Human corrections via UI → update `sense_assignment_chirho` and `domain_assignment_chirho` in SQLite
   - Re-run scorecard to measure improvement
   - Re-cluster nearby lemmas affected by corrections
   - Track all corrections with timestamps for audit trail

#### Acceptance Criteria
- At least one disambiguation UI functional (SvelteKit web recommended for Phase 4)
- Top-100 most uncertain lemmas reviewed by humans
- Measurable scorecard improvement after each review cycle
- Corrections persisted to SQLite with audit trail

---

### Phase 5: Evaluation + Comparison

**Goal**: Validate quality against open baselines.

#### Tasks

1. **Baseline comparison**
   - Import UBS open CC BY-SA lexical semantic domains as a comparison set
   - Import SIL semantic domains as a second baseline
   - Compute agreement metrics:
     - Adjusted Rand Index between our sense clusters and UBS senses
     - Normalized Mutual Information between our domains and SIL domains

2. **Cross-validation**
   - Hold out 1-2 languages from feature computation
   - Train senses on remaining languages
   - Test: can the model predict held-out language glosses from sense assignments?
   - This measures whether senses capture genuine semantic distinctions

3. **Export deliverables**
   - Create `export-domains-chirho.ts`
   - Export formats:
     - JSON: full ontology with senses, domains, assignments, evidence
     - SQL: portable dump of semantic tables
     - SWORD module annotations (if compatible)
     - CSV: for spreadsheet review

#### Acceptance Criteria
- Agreement with UBS/SIL baselines measurably above random
- Held-out language prediction accuracy > 60%
- Clean export in all formats
- Full provenance trail (CC BY-SA compatible)

---

## 5. Scoring Metrics (The Scorecard)

Every proposal is evaluated on these metrics (all are join + group-by heavy — ideal for relational acceleration):

| Metric | Query Pattern | Target |
|--------|--------------|--------|
| **Coverage** | `COUNT(assigned) / COUNT(total)` | >95% of occurrences |
| **Sense Coherence** | Avg cross-language entropy within sense clusters | Lower is better |
| **Domain Coherence** | Avg intra-domain sense similarity | Higher is better |
| **Separation** | Inter-domain distinctness (avg distance between domain centroids) | Higher is better |
| **Cross-lingual Consistency** | Do domains predict translation choices? | Higher is better |
| **Constraint Violations** | Hierarchy + POS + disjointness violations | <5% |
| **Human Agreement** | Agreement with human-reviewed samples | >80% |

---

## 6. Feature Weighting for Translation Signatures

For each token occurrence `o`, the feature vector uses:

| Feature Type | Source | Weight | Example |
|-------------|--------|--------|---------|
| Phrase | `gloss_phrase_chirho` | 3.0 | `(spa, "hacer-conocido")` |
| Head | `gloss_head_chirho` | 2.0 | `(spa, "conocido")` |
| Part | `gloss_part_chirho` | 1.0 | `(spa, "hacer")`, `(spa, "conocido")` |
| Morphosyntax | `word.morph` | 0.5 | `("TenseAspect", "Perfect")` |
| Local context | ±3 window lemmas | 0.3 | `("ctx", "אֱלֹהִים")` |

---

## 7. Gloss Style Guide (Machine-Checkable)

Enforced by `validate-glosses-chirho.ts`:

| Separator | Meaning | Example |
|-----------|---------|---------|
| `-` (dash) | Composition only | `make-known`, `heart-desire` |
| `\|` (pipe) | Alternatives / uncertainty | `judge\|rule` |
| None | Single word gloss | `word`, `love` |

**Rules**:
- No grammar inside gloss phrases (tense/voice/case → separate `morph` fields)
- Normalize all dash variants (en-dash, em-dash) to ASCII `-`
- Normalize Unicode to NFKC
- Trim whitespace
- Consistent casing per script/language

---

## 8. Hardware & Compute Strategy

### 8.1 Available Hardware

| Platform | Specs | Best For | Access |
|----------|-------|----------|--------|
| **Apple M4 (local)** | GPU (Metal/MPS) + NPU (ANE) + unified memory | Daily dev, clustering, small-model inference, Rust hot-path | Always available |
| **Lambda.ai H200** | NVIDIA H200 (141GB HBM3e) | Large embedding models, massive similarity matrices, GPU-heavy clustering | On-demand instances |
| **AMD KV260 (local FPGA)** | Kria KV260, Zynq UltraScale+ | Custom relational kernels, streaming join/aggregate, learning FPGA dev | Own hardware |
| **AWS F2 instances** | Xilinx FPGA | Production-scale relational acceleration, CHI-RHO engine deployment | On-demand |

### 8.2 Workload → Hardware Mapping

| Workload | Hardware | Language | Why |
|----------|----------|----------|-----|
| Postgres → SQLite import | M4 (local) | Bun/TS | I/O bound, not compute-heavy |
| Feature materialization (30M rows) | M4 (local) | Rust | CPU-bound string processing, benefits from Rust speed |
| Pairwise cosine similarity | M4 GPU (Metal) | Rust + `metal-rs` | 13K lemmas × variable occurrences, embarrassingly parallel |
| HDBSCAN clustering | M4 GPU or H200 | Rust (CPU) or Python+CUDA (H200) | M4 for most lemmas; H200 for full-corpus joint embedding |
| Contextual embeddings | H200 | Python + PyTorch | Large transformer models need HBM |
| Entropy computation | M4 (local) | Rust | Group-by + aggregate — fast in Rust on 30M rows |
| Transitive closure | KV260 / F2 | Verilog/VHDL + Rust host | Iterative join — ideal FPGA learning project |
| Proposal scoring (full scorecard) | KV260 / F2 | Verilog/VHDL + Rust host | Multiple join-aggregate passes, streaming pipeline |
| Incremental delta evaluation | KV260 / F2 | Verilog/VHDL | Semi-naïve Datalog — the CHI-RHO sweet spot |
| LLM-assisted labeling | API (Claude) | Bun/TS | Anthropic API calls |

### 8.3 Pragmatic Approach

> **Rule of thumb**: Use Rust on M4 for everything unless (a) GPU parallelism gives >10× speedup, or (b) the workload is a good learning opportunity for FPGA dev. Don't spend an hour building something to save 10 minutes — but *do* build it if it teaches us the hardware.

**Phase 1-2**: Pure Rust + Bun/TS on M4. SQLite handles 30M rows fine with WAL mode.
**Phase 2-3**: Optionally offload similarity matrices to M4 Metal GPU or H200 if needed.
**Phase 3+**: FPGA experiments on KV260 for relational kernels — treat as learning + acceleration.
**Production**: If proposal evaluation becomes a bottleneck, deploy streaming kernels on F2.

### 8.4 FPGA Kernel Primitives (KV260 / F2)

If we build custom FPGA acceleration, implement these five primitives well:

1. **Columnar scan + filter** — predicate pushdown on integer-encoded columns
2. **Sort-merge join** — streaming join on pre-sorted integer keys
3. **Hash join** — for unsorted or skewed key distributions
4. **Group-by aggregation** — count, sum, top-k, approximate heavy hitters
5. **Set operations** — union/diff for semi-naïve Datalog delta evaluation

### 8.5 M4 NPU (Apple Neural Engine) Notes

The ANE is useful for:
- Small model inference (quantized sense classifiers, lightweight embeddings)
- Via Core ML / `coremltools` from Python, or `ane_transformers` for transformer models
- Not directly programmable from Rust yet, but accessible via Swift FFI if needed

### 8.6 Engineering Tricks at Scale

- Dictionary-encode everything to integers early (Rust `HashMap<String, u32>`)
- Sort by join keys for streaming merge joins
- Partition large relations (by lemma, by language)
- Delta evaluation: only recompute what changed between proposals
- Sketches (Count-Min, HyperLogLog) for ranking when exactness isn't needed
- SQLite WAL mode + `PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;` for write throughput
- Batch inserts (1000-row transactions) for materialization speed

---

## 9. File Structure (this project)

```
semantic-chirho/
├── AGENTS.md                              # Project conventions + platform-chirho reference
├── CLAUDE.md                              # → @AGENTS.md
├── init-chirho.md                         # Theoretical foundation
├── prd-semantic-domains-chirho.md         # This PRD
├── package.json                           # Bun project config
├── .env-chirho                            # Local secrets (GITIGNORED)
├── .gitignore
│
├── data-chirho/                           # Local database (GITIGNORED)
│   └── semantic-chirho.db                 # SQLite — all feature/sense/domain data
│
├── migrations-chirho/                     # SQLite schema migrations
│   └── 0001-semantic-tables-chirho.sql
│
├── tools-chirho/                          # Bun/TS CLI tools (orchestration layer)
│   ├── import-base-facts-chirho.ts        # Phase 1: Postgres → SQLite import
│   ├── materialize-gloss-features-chirho.ts  # Phase 1: Feature extraction
│   ├── validate-glosses-chirho.ts         # Phase 1: Style validation
│   ├── scorecard-chirho.ts                # Phase 1: Evaluation queries
│   ├── build-features-chirho.ts           # Phase 2: Calls Rust binary
│   ├── cluster-senses-chirho.ts           # Phase 2: Calls Rust binary
│   ├── validate-senses-chirho.ts          # Phase 2: Entropy checks
│   ├── label-senses-chirho.ts             # Phase 2: LLM labeling (Claude API)
│   ├── seed-domains-chirho.ts             # Phase 3: Ontology seed
│   ├── sense-similarity-chirho.ts         # Phase 3: Calls Rust binary
│   ├── detect-domains-chirho.ts           # Phase 3: Community detection
│   ├── assign-domains-chirho.ts           # Phase 3: Domain assignment
│   ├── prioritize-review-chirho.ts        # Phase 4: Active learning
│   └── export-domains-chirho.ts           # Phase 5: Export
│
├── crates-chirho/                         # Rust workspace (hot-path compute)
│   ├── Cargo.toml                         # Workspace root
│   ├── core-chirho/                       # Shared types, SQLite access, dictionary encoding
│   │   └── src/lib.rs
│   ├── materialize-chirho/                # Feature materialization (string processing, 30M rows)
│   │   └── src/main.rs
│   ├── cluster-chirho/                    # HDBSCAN clustering + cosine similarity
│   │   └── src/main.rs                    # Also compilable to WASM via wasm-pack
│   ├── entropy-chirho/                    # Entropy computation + validation
│   │   └── src/main.rs
│   ├── similarity-chirho/                 # Sense-to-sense similarity graph
│   │   └── src/main.rs                    # Also compilable to WASM via wasm-pack
│   └── fpga-kernels-chirho/               # FPGA kernel definitions (Phase 3+)
│       ├── src/                           # Rust host-side driver
│       └── hdl-chirho/                    # Verilog/VHDL for KV260 / F2
│
├── apps-chirho/                           # Disambiguation & review UIs
│   ├── disambiguate-web-chirho/           # SvelteKit 2 web app (primary)
│   │   ├── src/routes/
│   │   │   ├── lemma-chirho/[lemma_id_chirho]/  # Lemma explorer
│   │   │   ├── sense-chirho/[sense_id_chirho]/  # Sense detail
│   │   │   ├── domain-chirho/[domain_id_chirho]/ # Domain browser
│   │   │   ├── review-chirho/queue-chirho/       # Review queue
│   │   │   ├── scorecard-chirho/                  # Dashboard
│   │   │   └── verse-chirho/[verse_id_chirho]/   # Verse context
│   │   └── package.json
│   └── disambiguate-desktop-chirho/       # Slint + Rust native desktop app (optional)
│       ├── src/main.rs                    # Direct SQLite access
│       ├── ui-chirho/                     # Slint UI definitions (.slint files)
│       └── Cargo.toml
│
├── spec-chirho/                           # Specifications
│   ├── gloss-style-guide-chirho.md        # Normalization rules
│   └── domain-ontology-seed-chirho.md     # Initial supersense list
│
└── output-chirho/                         # Generated outputs
    ├── scorecards-chirho/                 # Proposal evaluation results
    ├── exports-chirho/                    # JSON/SQL/CSV exports
    └── reports-chirho/                    # Validation reports
```

### .env-chirho (template)

```env
# For God so loved the world that he gave his only begotten Son,
# that whoever believes in him should not perish but have eternal life.

# Platform-chirho Postgres (Docker, read-only source)
PLATFORM_DB_URL_CHIRHO=postgresql://postgres:asdfasdf@localhost:5435/postgres

# Local SQLite path
SQLITE_PATH_CHIRHO=./data-chirho/semantic-chirho.db

# Anthropic API (for LLM-assisted labeling)
ANTHROPIC_API_KEY_CHIRHO=sk-ant-...

# Lambda.ai (H200 GPU instances)
LAMBDA_API_KEY_CHIRHO=...
LAMBDA_INSTANCE_TYPE_CHIRHO=gpu_1x_h200

# FPGA (optional, for KV260 / F2 experiments)
FPGA_TARGET_CHIRHO=kv260  # or 'f2'
```

---

## 10. Ralph Loop Task Breakdown

Each phase is designed to be independently loopable. Here's the suggested ralph-loop execution order:

### Loop 1: Project Setup + Schema (Phase 1a)
```
1. Initialize Bun project (package.json, .gitignore, .env-chirho template)
2. Initialize Rust workspace (crates-chirho/Cargo.toml, core-chirho crate)
3. Create migrations-chirho/0001-semantic-tables-chirho.sql (all tables from Section 3)
4. Create tools-chirho/import-base-facts-chirho.ts (Postgres → SQLite import)
5. Run import: pull word_chirho, lemma_chirho, gloss_import_chirho into local SQLite
6. Verify import (row counts, spot-check a few verses)
```

### Loop 2: Feature Materialization (Phase 1b) — Rust hot path
```
1. Create crates-chirho/core-chirho/ (shared SQLite access, dictionary encoding, types)
2. Create crates-chirho/materialize-chirho/ (string normalization, dash/pipe splitting)
3. Build & run: materialize all 38+ languages into gloss_phrase/part/head/alt tables
4. Verify row counts (expect ~30M in gloss_phrase_chirho)
5. Create tools-chirho/validate-glosses-chirho.ts (style validation report)
6. Run validation, review output report
```

### Loop 3: Scorecard Queries (Phase 1c)
```
1. Create tools-chirho/scorecard-chirho.ts
2. Implement all 6 scorecard metrics as SQLite queries
3. Test on sample lemmas
4. Benchmark query performance (<5s target on M4)
```

### Loop 4: Sense Induction (Phase 2) — Rust clustering
```
1. Create crates-chirho/cluster-chirho/ (feature vector construction + HDBSCAN)
2. Create tools-chirho/build-features-chirho.ts (orchestrates Rust binary)
3. Create tools-chirho/cluster-senses-chirho.ts (orchestrates Rust binary)
4. Run clustering on all 13K lemmas
5. Create crates-chirho/entropy-chirho/ (cross-language entropy computation)
6. Create tools-chirho/validate-senses-chirho.ts (split/merge loop)
7. Persist to sense_chirho + sense_assignment_chirho
8. Create tools-chirho/label-senses-chirho.ts (Claude API labeling)
9. Generate LLM labels for all sense clusters
```

### Loop 5: Domain Ontology (Phase 3) — Rust similarity + Bun orchestration
```
1. Create tools-chirho/seed-domains-chirho.ts (SIL + custom supersenses)
2. Seed domain hierarchy into domain_chirho
3. Create crates-chirho/similarity-chirho/ (sense-to-sense similarity graph)
4. Build similarity graph
5. Create tools-chirho/detect-domains-chirho.ts (community detection)
6. Run Louvain/Leiden on sense graph
7. Create tools-chirho/assign-domains-chirho.ts (domain assignment + constraints)
8. Assign senses to domains, apply constraints, greedy repair
9. Score proposal with scorecard, store in proposal_chirho
```

### Loop 6: Export + Evaluation (Phase 5)
```
1. Create tools-chirho/export-domains-chirho.ts
2. Export in JSON, SQL, CSV formats
3. Compare against UBS/SIL baselines (agreement metrics)
4. Run cross-validation (held-out language test)
5. Generate final report
```

### Loop 7 (optional): FPGA Experiments (Learning + Acceleration)
```
1. Create crates-chirho/fpga-kernels-chirho/ (Rust host driver)
2. Create hdl-chirho/ (Verilog for columnar scan + sort-merge join)
3. Target KV260 first (local iteration), then F2 (production scale)
4. Benchmark: FPGA scorecard evaluation vs. SQLite baseline
5. Document learnings
```

---

## 11. Dependencies

### Bun/TS packages
- `better-sqlite3` or `bun:sqlite` — SQLite driver (Bun has built-in SQLite support)
- `postgres` — PostgreSQL client (for initial import from platform-chirho only)
- `@anthropic-ai/sdk` — Claude API client (for LLM-assisted labeling)
- `@modelcontextprotocol/sdk` — MCP integration (optional, for Claude Code tooling)
- `dotenv` — load `.env-chirho`

### Rust crates
- `rusqlite` — SQLite bindings
- `linfa` + `linfa-clustering` — HDBSCAN, agglomerative clustering
- `ndarray` — N-dimensional arrays for feature vectors
- `rayon` — parallel iterators for multi-core M4
- `metal` (via `metal-rs`) — M4 GPU compute shaders (optional)
- `serde` + `serde_json` — serialization for Bun↔Rust IPC
- `unicode-normalization` — NFKC normalization

### External data (open license)
- SIL Semantic Domains (CC BY-SA 4.0) — ~1800 domains with elicitation questions
- UBS open dictionaries (CC BY-SA 4.0) — lexical semantic domains for Hebrew/Greek

### Infrastructure
- platform-chirho Docker Postgres (port 5435) — read-only source
- Local SQLite `data-chirho/semantic-chirho.db` — primary working database
- Bun runtime (TS orchestration)
- Rust toolchain (hot-path compute)
- Claude API via `.env-chirho` (for LLM-assisted labeling in Phase 2/3)
- Lambda.ai account (optional, for H200 GPU workloads)
- AMD KV260 FPGA (optional, for relational kernel experiments)

---

## 12. Success Criteria

| Milestone | Metric | Target |
|-----------|--------|--------|
| Feature tables populated | Row count in gloss_phrase_chirho | ~30M rows |
| Senses induced | Total sense clusters | 20K–40K |
| Cross-language entropy reduced | Avg entropy within vs. across senses | >30% reduction |
| Domains created | Hierarchy size | 15-30 supersenses, 200-800 fine domains |
| Coverage | % of occurrences with sense+domain | >95% |
| Human agreement | Expert review of top-100 lemmas | >80% agreement |
| Baseline comparison | Agreement with UBS/SIL | Above random, measurably |
| All deliverables traceable | Every assignment has evidence trail | 100% |

---

## 13. Licensing

- All code: MIT or project-chosen license
- Semantic domain ontology output: CC BY-SA 4.0 (compatible with SIL seed data)
- No dependency on Louw-Nida copyrighted material
- Clean provenance trail for all derived data

---

## 14. North Star Principle

> **Make every semantic/domain decision traceable to evidence** (occurrences + alignments + context), **and make every proposal testable with fast, repeatable queries.**

This gives us excellence without unnecessary complexity, and it matches our commitment to doing the work honestly and carefully. To God be the glory.
