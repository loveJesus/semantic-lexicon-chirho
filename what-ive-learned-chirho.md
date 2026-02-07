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

## 1st Pass Retrospective — What Worked and What Didn't

### What Worked
- **Sense induction via translation signatures**: 96.1% cross-language entropy reduction on held-out languages (kor, swa) proves that multilingual gloss divergence IS a strong signal for polysemy
- **Agglomerative clustering**: Simple, interpretable, no hyperparameter soup — good for a first pass
- **Rust hot-path + Bun orchestration**: 14.6K lemmas clustered in ~5 min, full pipeline in <30 min
- **Validation loop**: Entropy-driven merge/split converged in 5 iterations, reduced 60,983→56,976 senses
- **Materialization**: Dictionary encoding + sparse vectors makes feature computation tractable on 7.6M glosses

### What Didn't Work

#### 1. Sense over-splitting (56,976 senses is ~2-3x too many)
- **Root cause**: Morphological variation in glosses treated as semantic divergence
- Hebrew binyanim (Qal/Niphal/Piel/Hiphil/etc.) systematically change translation patterns:
  - H7311 Qal → "be high/exalted" vs H7311 Hiphil → "raise/lift up/exalt"
  - These are morphological derivations, not independent senses
- Tense/aspect markers also leak into glosses across languages (imperfect "will do" vs perfect "did")
- Result: H7311a has 120 senses — should have ~5-6 (per BDB/HALOT)
- The clustering algorithm reads ONLY from gloss_phrase/head/part — grammar_chirho is imported but NEVER queried

#### 2. Domain assignment is meaningless (hash-based)
- assign-domains-chirho.ts uses polynomial hash of lemma_id + sense_id mod 20
- Result: perfectly uniform distribution (2,816-2,899 senses per domain, CV=0.92%)
- Real semantic domains have SKEWED distributions — Louw-Nida Domain 33 (Communication) has 200+ entries, some domains have <10
- Scorecard domain_coherence, separation, cross_lang_consistency all stubbed to 0

#### 3. Similarity was never computed
- 57K² = 3.25 billion pairs — was called "infeasible" but actually takes ~5-15 min on M4 with rayon
- This blocked: community detection, fine domain creation, meaningful domain assignment
- Result: 0 subdomains, flat taxonomy

#### 4. Grammar data is rich but unused
- `grammar_chirho` has full morphological codes: `V-Qal-Perf-3ms`, `Conj-w | V-Piel-ConsecImperf-3ms`, `N-msc`, etc.
- 3,982 unique grammar values, encoding: binyan, tense, person, number, gender, state
- Strong's sub-entries exist (H7311a vs H7311) — also unused
- `lemma_chirho.pos_chirho` has the most common POS per lemma — not used in clustering

### Key Numbers to Remember
| Metric | Value | Target |
|--------|-------|--------|
| Senses | 56,976 | ~20-25K (after morph-aware clustering) |
| Senses/lemma avg | 3.89 | ~1.5-2.0 |
| Max senses (H7311a) | 120 | ~5-6 |
| Domains | 20 supersenses, 0 fine | 20 super + 200-500 fine |
| Domain distribution CV | 0.92% (uniform) | 30-60% (skewed, natural) |
| Similarity computed | 0 pairs | ~3.25B (57K²) or ~625M (25K²) |
| Grammar features used | 0 | binyan + POS at minimum |

### Comparison to Louw-Nida
| Dimension | L&N | semantic-chirho (pass 1) |
|-----------|-----|--------------------------|
| Scope | NT Greek only (~5K entries) | Full Bible H+G (14.6K lemmas) |
| Domains | 93 major, ~750 sub | 20 super, 0 sub |
| Distribution | Natural skew | Uniform (hash) |
| Morphology | Manual expert analysis | Ignored |
| Method | Expert curation (decades) | Automated (30 min) |
| Senses | ~5K well-curated | 57K over-split |
| License | UBS copyright | CC BY-SA 4.0 |
| Languages | Monolingual (Gk→En) | 43 parallel translations |

### Architecture for 2nd Pass
1. **Morphology-aware clustering**: Parse grammar_chirho, add binyan/POS as weighted features, raise clustering threshold
2. **Run real similarity**: 57K² is feasible on M4 (~5-15 min with rayon) — no excuses
3. **Community detection on real edges**: Louvain on sparse similarity graph → fine domains
4. **Assign domains by similarity**: Replace hash with nearest-centroid prototype matching
5. **Implement remaining scorecard metrics**: domain_coherence, separation, cross_lang_consistency
