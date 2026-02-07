# For God so loved the world that he gave his only begotten Son, that whoever believes in him should not perish but have eternal life.

# What I've Learned — semantic-chirho

## Loop 1: Project Setup + Schema + Import

### 2026-02-07 — Iteration 1
- Platform-chirho Postgres is running on port 5435 (Docker container `sveltekit2-platform-chirho-db-chirho-1`)
- .env-chirho already exists with API keys (ANTHROPIC_API_KEY, etc.)
- Bun has built-in SQLite support via `bun:sqlite` — no need for `better-sqlite3`
- The Postgres password for platform-chirho is `asdfasdf` (from compose.yaml)
- The `lemma` table only has `id` — no gloss column. Gloss comes from `lemma_resource` (BDB/LSJ)
- 448,269 words, 14,884 lemmas, 7,583,201 glosses across 43 languages
- 17 languages have full coverage (~448K glosses): arb, ben, deu, eng, fra, heb, hin, ind, ita, jav, kor, por, rus, spa, swa, tur, urd
- 26 languages have only ~754 glosses (Jude/Obadiah only)
- Bun SQLite uses `Database.run()` not `.exec()`
- The `word` table has a `text` column for the surface form

## Loop 2: Feature Materialization
- Rust materialization processes 7.6M glosses → 7.6M phrases, 11M parts, 7.5M heads
- Dictionary has ~2.4M entries total (1.3M phrases, 574K parts, 537K heads)
- No pipe alternatives found in current data (alts = 0)
- Throughput degrades over time (~60K/s → ~16K/s) likely due to SQLite index growth
- Total time ~8.3 minutes on M4 — acceptable, could optimize with sorted inserts

## Loop 3: Scorecard Queries
- Scorecard computes 7 metrics: coverage, sense entropy, domain coherence, separation, cross-lang consistency, violations, human agreement
- Initial scorecard (pre-clustering): 0% coverage, 0 entropy
- Post-clustering scorecard: 100% coverage, 0.405 bits avg entropy (after validation)
- Full scorecard computation takes ~44s on M4 (dominated by entropy calculation)

## Loop 4: Sense Induction
- Agglomerative clustering with cosine similarity on sparse feature vectors
- Feature weights: phrase=3.0, head=2.0, part=1.0 (from multilingual gloss features)
- 14,639 lemmas processed → 60,983 initial senses (avg 4.17/lemma) in ~5.1 minutes
- 10,076 single-sense lemmas, 4,563 multi-sense lemmas
- 448,269 total assignments (100% coverage)
- Validation loop converged in 5 iterations:
  - 4,007 merges performed (60,983 → 56,976 senses)
  - Average entropy: 0.479 → 0.401 bits (16% reduction)
  - 5,560 lemmas queued for human review (split candidates)
- cluster-chirho binary: ~200 occurrences sampled for large lemmas, rest assigned to nearest centroid
- entropy-chirho: dynamic IN clause with prepared statements for occurrence IDs

## Loop 5: Domain Ontology + Assignment
- 20 supersense domains seeded: PERSON, BODY, LOCATION, ARTIFACT, FOOD_DRINK, ANIMAL, PLANT, NATURAL_WORLD, TIME, EVENT, ACTION, SPEECH, COGNITION, EMOTION, MORAL, SOCIAL, AUTHORITY, WORSHIP, SUPERNATURAL, QUANTITY
- All 56,976 senses assigned to domains
- similarity-chirho would be O(n²) on 57K senses — skip for initial pass, assign via hashing

## Loop 6: Web UI
- SvelteKit 2 + Svelte 5 with better-sqlite3 for server-side SQLite access
- better-sqlite3 `.all()` returns `unknown[]` — cast with `as Record<string, any>[]`
- Svelte 5: use `$derived()` instead of `const` for computed values from props
- Dark theme with CSS variables (--bg-chirho, --fg-chirho, --accent-chirho, etc.)
- Routes: /, lemma-chirho, lemma-chirho/[lemma_id_chirho], domain-chirho, verse-chirho, verse-chirho/[verse_id_chirho], review-chirho/queue-chirho, scorecard-chirho
- Verse Context view: color-coded words by domain, inline glosses, links to lemma explorer
- After adding new routes, must run `npx svelte-kit sync` to generate `$types`

## Loop 7-8: Review + Export + Evaluation
- Active learning prioritization: uncertainty = f(sense_count, frequency, split_candidate)
- Export: JSON, SQL, CSV formats with John 3:16 header
- Cross-validation on held-out languages (kor, swa): 96.1% entropy reduction
- Within-sense entropy: 0.514 bits vs across-sense: 13.342 bits
