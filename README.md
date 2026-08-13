# For God so loved the world that he gave his only begotten Son, that whoever believes in him should not perish but have eternal life. — John 3:16

# semantic-chirho

**Token → Sense → Domain**: a data-driven semantic pipeline that maps every Hebrew, Aramaic, and Greek word occurrence in Scripture to lexical senses and hierarchical semantic domains — driven by multilingual translation signatures from 38+ parallel glossed translations.

---

## Overview

Given ~800K original-language tokens across 66 biblical books, semantic-chirho answers two questions for every word:

1. **Which sense?** (word-sense disambiguation / sense induction)
2. **Which semantic domain?** (conceptual category assignment into a hierarchical ontology)

The primary evidence signal is **translation divergence** across 38+ languages. When the same Hebrew lemma maps to different glosses across language families, it almost certainly signals distinct senses.

### The Three-Layer Model

```
Layer 0: BASE FACTS       — imported from platform-chirho Postgres
  Tokens, lemmas, alignments, morphology, glosses (~7.6M glosses across 43 languages)

Layer 1: DERIVED FEATURES — computed in SQLite (dictionary-encoded, sparse multilingual vectors)
  gloss_phrase_chirho, gloss_part_chirho, gloss_head_chirho, gloss_alt_chirho

Layer 2: SEMANTIC LAYER   — the deliverable
  sense_chirho → sense_assignment_chirho → domain_chirho → domain_assignment_chirho
```

---

## Project Status

| Phase | Status |
|-------|--------|
| Base facts import | ✅ Complete (448K words, 14.9K lemmas, 7.6M glosses) |
| Feature materialization | ✅ Complete (dictionary-encoded sparse vectors) |
| Sense induction (pass 1) | ✅ Complete (57K senses, 96.1% cross-lang entropy reduction) |
| Domain seeding (supersenses) | ✅ Complete (20 supersense domains) |
| Domain assignment (pass 1) | ⚠️ Hash-based (placeholder — see pass 2 plan) |
| LLM merge pass (tier 2) | 🔄 In progress (31/200 lemmas merged) |
| Web UI (disambiguation) | ✅ SvelteKit 2 + Svelte 5 app |
| Web UI (lexicon) | ✅ SvelteKit 2 + Svelte 5 app |
| PDF lexicon export | ✅ Complete |
| Pass 2: morph-aware clustering | 📋 Planned |

### Key Metrics (Pass 1 Retrospective)

| Metric | Value | Target (Pass 2) |
|--------|-------|------------------|
| Senses | 56,976 | ~20–25K |
| Avg senses per lemma | 3.89 | ~1.5–2.0 |
| Max senses (single lemma) | 120 (H7311a) | ~5–6 |
| Domains | 20 supersenses, 0 fine | 20 super + 200–500 fine |
| Cross-validation entropy reduction | 96.1% (kor, swa) | — |

Read the full retrospective: [`what-ive-learned-chirho.md`](what-ive-learned-chirho.md)

---

## Quick Start

### Prerequisites

- **Bun** ≥ 1.0
- **Rust** toolchain (for compute crates)
- **platform-chirho** Postgres running on Docker (port 5435) — sibling project at `../platform-chirho/`
- `.env-chirho` configured with:
  ```
  PLATFORM_DB_URL_CHIRHO=postgres://postgres:asdfasdf@localhost:5435/bible
  ANTHROPIC_API_KEY_CHIRHO=sk-ant-...
  ```

### Setup

```bash
# Install dependencies
bun install

# Build Rust crates
cd crates-chirho && cargo build --release && cd ..

# Create SQLite database and run migrations
bun run migrate-chirho

# Import base facts from platform-chirho Postgres
bun run import-chirho

# Materialize gloss features (dictionary encoding + sparse vectors)
bun run materialize-chirho
```

### Pipeline Steps

```bash
# Cluster word occurrences into senses (Rust hot-path)
bun run cluster-chirho

# Validate and merge over-split clusters
bun run validate-senses-chirho

# Label senses with descriptions
bun run label-senses-chirho

# Seed 20 supersense domains
bun run seed-domains-chirho

# Assign senses to domains
bun run assign-domains-chirho

# Run full scorecard
bun run scorecard-chirho
```

### Web UIs

```bash
# Disambiguation UI (lemma explorer, verse context, review queue)
cd apps-chirho/disambiguate-web-chirho
bun install
bun run dev

# Lexicon browser
cd apps-chirho/lexicon-web-chirho
bun install
bun run dev
```

---

## Architecture

### Language Strategy

| Layer | Tech | Why |
|-------|------|-----|
| **Orchestration** | Bun + TypeScript | CLI tools, LLM calls, data import/export (~42 tools) |
| **Hot-path compute** | Rust (native binaries) | Clustering, similarity matrices, entropy, transitive closure |
| **Web UI** | SvelteKit 2 / Svelte 5 | Lemma explorer, verse context, review queue |
| **Database** | SQLite (local) | Self-contained, portable, fast for single-machine iteration |

### Rust Crates

| Crate | Purpose |
|-------|---------|
| `core-chirho` | Shared types, dictionary encoding, DB connection |
| `cluster-chirho` | Agglomerative clustering on sparse feature vectors |
| `entropy-chirho` | Entropy computation over sense/gloss distributions |
| `materialize-chirho` | Gloss feature materialization (7.6M glosses) |
| `similarity-chirho` | Cosine similarity matrices (rayon-parallelized) |

Rust crates are called from Bun via `Bun.spawn()` as child processes reading/writing JSON.

### Data Flow

```
platform-chirho Postgres (port 5435)
        │
        ▼  import-base-facts-chirho.ts
SQLite: data-chirho/semantic-chirho.db
        │
        ▼  materialize-gloss-features-chirho.ts (→ Rust materialize-chirho)
SQLite: dictionary tables + gloss_phrase/part/head/alt
        │
        ▼  cluster-senses-chirho.ts (→ Rust cluster-chirho)
SQLite: sense_chirho + sense_assignment_chirho
        │
        ▼  validate-senses-chirho.ts + merge-senses-llm-chirho.ts
SQLite: refined senses (LLM merge pass)
        │
        ▼  seed-domains-chirho.ts + assign-domains-chirho.ts
SQLite: domain_chirho + domain_assignment_chirho
        │
        ▼  export-domains-chirho.ts
JSON / SQL / CSV / PDF
```

---

## Key Design Decisions

### Why SQLite instead of Postgres?

- Self-contained — no Docker dependency for development
- `.gitignore`d database lives in `data-chirho/`
- Fast enough for single-machine iteration on 30M+ rows
- Base facts imported once from platform-chirho Postgres, then all computation is local

### Why translation signatures?

Translation divergence across language families is a **stronger signal of polysemy** than monolingual context alone. When the same Hebrew lemma maps to different glosses across unrelated languages, those patterns cluster cleanly into senses. Our cross-validation on held-out languages (Korean, Swahili) showed **96.1% entropy reduction** — proving the signal is real.

### Why Rust for the hot path?

- 7.6M glosses with feature vectors
- 57K senses with pairwise similarity (3.25B pairs)
- Bun is too slow for this scale; Rust with rayon handles it in minutes on an M4

---

## Current LLM Merge Pass (Tier 2)

We are running Opus subagents in pairs to merge over-split sense clusters into real lexicographic senses. This is the critical quality step between the automated pass 1 and a usable lexicon.

- **Progress**: 31 of 200 high-priority lemmas merged
- **Remaining**: 169 lemmas in `output-chirho/merge-batches-chirho/remaining-chirho.json`
- **Responses**: Individual merge results in `output-chirho/merge-responses-chirho/`
- **Observations**: Linguistic notes logged to `output-chirho/merge-responses-chirho/observations-chirho.jsonl`
- **Quality rule**: Opus only (Sonnet over-collapses senses — e.g., H8130: Sonnet 2, Opus 6)

### Tools for merge management

```bash
# Extract merge prompts for next batch
bun run tools-chirho/extract-merge-prompts-chirho.ts

# Apply merge responses
bun run tools-chirho/apply-merge-responses-chirho.ts

# Compose gloss translations for validated senses
bun run tools-chirho/compose-glosses-chirho.ts
```

---

## Directory Structure

```
semantic-chirho/
├── apps-chirho/
│   ├── disambiguate-web-chirho/   # SvelteKit 2 UI: lemma explorer, verse context
│   └── lexicon-web-chirho/        # SvelteKit 2 UI: lexicon browser
├── assets-chirho/                 # Static assets
├── crates-chirho/                 # Rust compute crates
│   ├── core-chirho/               # Shared types, dictionary encoding, DB
│   ├── cluster-chirho/            # Agglomerative clustering
│   ├── entropy-chirho/            # Entropy computation
│   ├── materialize-chirho/        # Gloss feature materialization
│   └── similarity-chirho/         # Cosine similarity matrices
├── data-chirho/                   # SQLite database (.gitignore'd)
├── migrations-chirho/             # SQL migration files
├── output-chirho/                 # Pipeline outputs
│   ├── exports-chirho/            # JSON/SQL/CSV/PDF exports
│   ├── merge-batches-chirho/      # LLM merge prompts
│   ├── merge-responses-chirho/    # LLM merge results
│   ├── scorecards-chirho/         # Pipeline scorecards
│   ├── reports-chirho/            # Generated reports
│   ├── composed-glosses-chirho/   # Composed gloss translations
│   └── translated-glosses-chirho/ # Translated glosses
├── spec-chirho/                   # Project specifications
├── templates-chirho/              # Prompt templates for LLM tools
├── tools-chirho/                  # 42 Bun/TS CLI tools
├── init-chirho.md                 # Theoretical foundation
├── prd-semantic-domains-chirho.md # Full implementation PRD
├── what-ive-learned-chirho.md     # Development journal & retrospective
├── AGENTS.md                      # Agent instructions (Chirho naming, tech stack)
├── CLAUDE.md                      # → symlink to AGENTS.md
├── package.json                   # Bun project config
└── .env-chirho                    # Local config (.gitignore'd)
```

---

## Sibling Project: platform-chirho

semantic-chirho reads from [`../platform-chirho/`](../platform-chirho/), our production Bible translation platform:

- **~800K** original-language word tokens
- **~13K** Hebrew + Greek lemmas
- **38+** target languages with 1:1 word glosses
- **1,249** book × language translation sets (~16GB of SQL)
- PostgreSQL 16 via Docker, SvelteKit 2 frontend, Drizzle ORM
- MCP server at `../platform-chirho/tools-chirho/mcp-server-chirho.ts`

---

## License

This project produces a CC BY-SA 4.0 semantic domain ontology — built from open data, not dependent on copyrighted resources (Louw-Nida © UBS). The source code is likewise open.

---

## Development Notes

- **Chirho naming**: All freely-named identifiers carry the `_chirho` suffix (functions, types, variables, parameters, closure bindings, for-loop variables, destructured bindings). See `AGENTS.md` for the full style guide.
- **New files**: Include the John 3:16 source header at the top.
- **LLM API**: Never use Anthropic API credits directly. All LLM work goes through Claude Code Task subagents.
- **Progress logging**: The `what-ive-learned-chirho.md` file serves as a development journal — add dated observations for each significant iteration.

---

*Soli Deo Gloria*