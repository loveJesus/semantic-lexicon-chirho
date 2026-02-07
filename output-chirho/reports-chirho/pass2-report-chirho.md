# Pass 2 Report: Morphology-Aware Clustering + Real Domain Assignment

**Date:** 2026-02-07
**Pipeline runtime:** ~25 minutes total

---

## Executive Summary

Pass 2 added morphology features (binyan, POS, construct state) to clustering and replaced hash-based domain assignment with nearest-centroid matching. The morphology features **improved per-sense entropy** (0.405 → 0.289 bits, a 29% reduction) but **increased total sense count** (56,976 → 82,214). The higher threshold (0.45 vs 0.30) combined with strong morphological features (weight 4.0) caused over-splitting rather than the expected consolidation. Domain assignment collapsed to a single supersense due to a centroid bootstrapping limitation.

**Key conclusion:** The statistical-only approach has hit its ceiling. An LLM-powered merge pass is needed to consolidate the over-split senses using semantic understanding.

---

## Pass 1 vs Pass 2 Comparison

| Metric | Pass 1 | Pass 2 | Delta | Assessment |
|--------|--------|--------|-------|------------|
| Total senses | 56,976 | 82,214 | +44% | **Worse** — more fragmentation |
| Avg sense entropy | 0.405 bits | 0.289 bits | -29% | **Better** — senses are more internally consistent |
| Coverage | 100% | 100% | = | Both complete |
| Entropy reduction (CV) | 96.8% | 97.1% | +0.3% | Slightly better |
| Domains | 20 (supersenses only) | 2,442 (20 super + 2,422 fine) | +2,422 | Community detection produced real fine domains |
| Domain coherence | 0 (stubbed) | 0.017 | N/A | Now measured, but low due to domain collapse |
| Separation | 0 (stubbed) | 0.000 | N/A | All senses in one supersense |
| Cross-lang consistency | 0 (stubbed) | 0.000 | N/A | Single-domain = no discrimination |
| POS-domain violations | 0 (stubbed) | 34,621 | N/A | Now detected — 42% of senses have POS mismatch |
| Avg senses/lemma | 3.89 | 5.62 | +44% | Higher granularity |
| Max senses for one lemma | ~120 | 306 | **Worse** |
| Pipeline time | ~15 min | ~25 min | +67% | Larger sample cap (500 vs 200) |

---

## Detailed Results

### Clustering (cluster-chirho)
- **14,639 lemmas** processed in **726s** (12 min)
- Rust binary with morphology features: POS (weight 4.0), binyan (weight 4.0), construct state (weight 2.0)
- Threshold: 0.45 (up from 0.30)
- Sample cap: 500 (up from 200)

### Sense Distribution

| Bucket | Lemmas | Senses | % of total senses |
|--------|--------|--------|-------------------|
| 1 sense | 9,841 | 9,841 | 12.0% |
| 2-3 senses | 798 | 2,030 | 2.5% |
| 4-6 senses | 1,328 | 6,635 | 8.1% |
| 7-15 senses | 1,469 | 14,626 | 17.8% |
| 16-50 senses | 941 | 25,021 | 30.4% |
| 51-100 senses | 185 | 12,624 | 15.4% |
| 100+ senses | 77 | 11,437 | 13.9% |

**The problem zone:** 1,203 lemmas (8.2%) with 16+ senses account for **49,082 senses** (59.7% of total). These are the common Hebrew verbs where the algorithm fragments most aggressively.

### Top 10 Over-Split Lemmas

| Strong's | Word | Senses | BDB expects |
|----------|------|--------|-------------|
| H5674a | עָבַר (pass over) | 306 | ~8-10 |
| H5375 | נָשָׂא (lift, carry) | 268 | ~6-8 |
| H7760a | שׂוּם (put, set) | 265 | ~5-7 |
| H8104 | שָׁמַר (keep, guard) | 251 | ~5-6 |
| H1980 | הָלַךְ (walk, go) | 243 | ~6-8 |
| H4672 | מָצָא (find) | 224 | ~4-5 |
| H5975 | עָמַד (stand) | 224 | ~5-7 |
| H7725 | שׁוּב (return) | 218 | ~5-6 |
| H3427 | יָשַׁב (sit, dwell) | 201 | ~4-6 |
| H5493 | סוּר (turn aside) | 195 | ~4-5 |

These 10 lemmas alone have 2,395 senses when they should have ~50-70 total.

### Validation (validate-senses-chirho)
- 5 iterations, converged when merge candidates dropped to 1
- Merged 2,938 senses (85,152 → 82,214)
- Average entropy improved: 0.321 → 0.287 bits
- 4,906 items flagged for review queue

### Similarity (similarity-chirho)
- **3.38 billion pairs** computed in **204 seconds** via rayon on M4
- Early-exit optimization: skipped pairs with no overlap after 50% of dimensions
- 3,730,056 edges above threshold 0.10 (0.11% of all pairs)
- **Performance:** ~16.5M pairs/second — M4 handled the 82K² matrix well

### Community Detection
- 3,344 communities from Louvain-like algorithm
- 2,422 significant communities (3+ senses) → became fine domains
- 20 supersenses + 2,422 fine domains = 2,442 total

### Domain Assignment
- **Bug found and fixed:** Old `domain_assignment_chirho` referenced stale sense IDs from pass 1. Fixed with a validation join.
- **Remaining issue:** Bootstrap centroid approach (partitioning senses by index) creates meaningless supersense centroids — all look identical, causing collapse to a single category.
- Result: All 82,214 senses assigned to PERSON with avg fit_score 0.0038

### Evaluation (evaluate-chirho)
- Held out: Korean (kor), Swahili (swa)
- Within-sense entropy: 0.381 bits
- Across-sense entropy: 13.342 bits
- **Entropy reduction: 97.1%** (up from 96.8% in pass 1)

---

## Root Cause Analysis

### Why senses increased instead of decreasing

The morphology features (weight 4.0) are **correctly separating different grammatical forms** — Qal occurrences cluster with Qal, Hifil with Hifil, etc. But they're **too dominant** in the vector space. Consider H7725 (שׁוּב, "return"):

- Qal "return, turn back" — these cluster together (good)
- Hifil "cause to return, restore" — these cluster separately (good)
- But within Qal, the 43 languages' gloss variations still cause fragmentation

The combination of **strong morph features (4.0)** + **strict threshold (0.45)** = more clusters, not fewer. Morph features prevent cross-binyan merging (correct) but the threshold prevents intra-binyan merging of near-synonyms (incorrect).

### Why domain assignment collapsed

The domain hierarchy has no semantic grounding. The 20 supersenses (PERSON, ARTIFACT, MOTION, etc.) are just labels. Nothing in the pipeline knows what "be high" means vs "walk" — it only knows that their gloss vectors differ. Without exemplar senses or LLM classification, the centroids are meaningless averages.

---

## Recommendations for Pass 3

### 1. LLM-Powered Sense Merging (Highest Impact)

Add `merge-senses-llm-chirho.ts` between clustering and validation:

```
For each lemma with >N senses:
  1. Gather top 3 glosses per sense (from eng, spa, arb)
  2. Include BDB/HALOT expected sense count if available
  3. Ask Claude: "These 218 clusters of H7725 (שׁוּב). Merge into ~5 senses."
  4. Execute merges in SQLite
```

**Cost estimate:** ~77 lemmas with 100+ senses + ~185 with 51-100 + ~941 with 16-50 = ~1,200 calls. At Haiku pricing: ~$0.30 total.

### 2. Reduce Morphology Weight

Lower morph feature weight from 4.0 to 1.5-2.0. It should **influence** clustering but not **dominate** it. The glosses should still be the primary signal.

### 3. Lower Threshold Back

Return threshold to 0.30-0.35. The higher threshold was counterproductive. Let the LLM merge pass handle the over-merging problem instead of trying to prevent it statistically.

### 4. LLM-Powered Domain Classification

Replace bootstrap centroid assignment with:
```
For each of the 3,344 communities:
  Show representative glosses from 5-10 senses
  Ask Claude: "Which of these 20 categories best fits?"
  Assign all community members to that supersense
```

### 5. Exemplar-Based Seeding

Pre-assign a handful of known senses to each supersense:
- PERSON: H0120 (אָדָם, "man"), H0802 (אִשָּׁה, "woman")
- MOTION: H1980 (הָלַךְ, "walk"), H7725 (שׁוּב, "return")
- ARTIFACT: H2719 (חֶרֶב, "sword"), H3627 (כְּלִי, "vessel")

This gives the centroids real semantic meaning.

---

## Pipeline Timing

| Step | Time | Notes |
|------|------|-------|
| cluster-chirho (Rust) | 726s | 14,639 lemmas × 500 sample cap |
| validate-senses-chirho | ~300s | 5 iterations × ~60s each |
| similarity-chirho (Rust/rayon) | 204s | 82K² = 3.38B pairs |
| community detection (JS) | ~45s | 77K nodes, 3.7M edges |
| assign-domains-chirho | ~300s | 82K prototype builds + assignment |
| scorecard-chirho | 128s | 4 real metrics computed |
| evaluate-chirho | 9s | 2-language holdout |
| **Total** | **~28 min** | |

---

## Files Modified in Pass 2

| File | Change |
|------|--------|
| `crates-chirho/core-chirho/src/lib.rs` | +MorphologyChirho struct, +parse_morphology_chirho(), +7 tests |
| `crates-chirho/cluster-chirho/src/main.rs` | +morph features (w=4.0), threshold 0.3→0.45, cap 200→500 |
| `crates-chirho/similarity-chirho/src/main.rs` | +early-exit optimization for sparse cosine |
| `tools-chirho/assign-domains-chirho.ts` | Replaced hash→nearest-centroid, fixed stale sense ID bug |
| `tools-chirho/scorecard-chirho.ts` | Implemented 4 metrics: coherence, separation, consistency, violations |
