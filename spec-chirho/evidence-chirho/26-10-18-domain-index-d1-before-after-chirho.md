<!-- For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. — John 3:16 (KJV) -->

# Domain-index D1 before and after evidence Chirho

## Before

The first mitigation was live as Worker version `a736aaf6-9fcc-42a1-83a7-839839415a94` at 100%. AICEO/claude2_chirho independently measured the wider 2026-10-18 14:10–14:33 UTC window at 340,867 D1 rows across 173 Worker requests, or about 1,970 rows per request. That remained about 96% below the original aligned 24-hour baseline of 53,201.3 rows per request, but repeated uncached domain routes exposed the next bounded cost.

A fresh pre-deploy read confirmed `a736aaf6-9fcc-42a1-83a7-839839415a94` as the current 100% Worker version and showed exactly `0002_materialize_domain_reads_chirho.sql` pending remotely. That version is the recorded rollback target for this landing.

Read-only `wrangler d1 insights` during the wider observation period confirmed these remaining request shapes:

| Query shape | Rows per run | Runs in the observed insights window |
|---|---:|---:|
| Domain-index Macro-32 `GROUP BY` | 20,344 | 6 |
| Louw-Nida domain lemma `GROUP BY` listing | 3,814 | 8 |
| Already-optimized related-domain lookup | 40.2 | 148, independently measured |

The domain-index route still recomputed the 33 Macro-32, 89 Louw-Nida/parent, and 1,237 community/parent aggregate rows from all 20,311 senses on every cache miss. Domain detail routes likewise regrouped senses by lemma before returning at most 200 items.

The configured local `origin` was updated from GitHub’s old redirecting URL to `https://github.com/loveJesus/semantic-lexicon-chirho.git`. `git ls-remote --symref origin HEAD` resolved `main_chirho` at `9cd9a4ade07acdda8df850c6b6fb948fe88eee71`. No GitHub-side name, visibility, or repository mutation was made.

## Candidate read model

Migration `0002_materialize_domain_reads_chirho.sql` adds two derived read-model tables without altering or deleting authoritative lexicon rows:

- `lexicon_domain_summary_chirho`: 1,359 hierarchy/name/parent aggregate rows.
- `lexicon_domain_lemma_chirho`: 47,938 ranked hierarchy/domain/lemma membership rows.

The domain index reads only the summary rows it renders. Domain detail resolution reads the matching summaries, ranked lemma selection uses a covering index and stops at 200, and current display data still joins from `lemma_entry_chirho` so gloss-only updates are not duplicated in the read model.

On a copy of the actual 210 MB lexicon database, the additive migration completed successfully. An exhaustive comparison checked 2,841 result sets covering all three complete domain-index lists, every domain’s ranked lemma list, every Macro-32 and Louw-Nida child list, and every domain-name precedence/total resolution. Candidate rows and order were byte-for-byte equivalent after JSON serialization.

`EXPLAIN QUERY PLAN` reported:

- domain-index community list: covering `idx_domain_summary_rank_chirho` search;
- domain-name resolution: covering `idx_domain_summary_name_chirho` search;
- ranked domain lemmas: covering `idx_domain_lemma_rank_chirho` search plus primary-key lemma lookups, with no temporary ordering tree.

Miniflare D1 metering on that migrated real-database copy, using D1’s own `meta.rows_read`, produced:

| Real route query set | Current code | Candidate | Reduction |
|---|---:|---:|---:|
| Domain index: all three hierarchy lists | 102,914 | 356 | 99.65% |
| Largest Macro-32 detail (`PROPERTIES_RELATIONS`) | 29,108 | 415 | 98.57% |
| Louw-Nida detail (`Linear Movement`) | 7,027 | 446 | 93.65% |
| Community detail (`Going Out and Forth`) | 498 | 134 | 73.09% |

The candidate domain-index statements read 66, 90, and 200 rows to return 33, 89, and 200 rows. The candidate detail sets include hierarchy resolution, the ranked lemma list, and child lists where applicable.

The built Worker was also run locally against the migrated real database. English and Spanish domain indexes plus representative Macro-32, Louw-Nida, and community detail pages returned 200; a missing domain returned 404.

## Independent pre-deploy review

SEMANTIC_CHIRHO/claude2_chirho returned PASS after exercising the real route modules against Miniflare D1 with metered `rows_read`. The review covered 1,762 requests per run: every routable Macro-32 and Louw-Nida page in English and Spanish, all 1,236 community pages, 150 Spanish community pages, the domain index, missing names, and regression samples.

Five parity runs found zero candidate output differences, including comparisons against both the currently deployed code and the original pre-mitigation code, rollback compatibility with migration 0002 left applied, and a simulated import that added and moved senses and changed occurrence and gloss data. The simulated import matched live computation after the documented refresh; without the refresh, only the touched counts and memberships were stale, while the live lemma join kept gloss text current.

The reviewer independently measured these current-to-candidate means:

| Route class | Current mean | Candidate mean | Candidate maximum |
|---|---:|---:|---:|
| Domain index | 102,914 | 356 | 356 |
| Macro-32 detail | 4,276 | 337 | 415 |
| Louw-Nida detail | 1,572 | 209 | 529 |
| Community detail | 97 | 23 | 403 |

Spanish means were 649 for Macro-32, 378 for Louw-Nida, and 45 for community detail. The reviewer also verified that migration 0002 is additive and idempotent, a rerun repairs tampered derived data, the generator and migration produce identical digests, all new queries use covering indexes, and the existing test and Svelte gates remain clean. Deploying code before the migration would return 500 on both domain routes, while applying migration 0002 first is a no-op for the currently deployed Worker. The required order is therefore migration first, then deployment.

## After

Pending migration, deployment, and live measurement.
