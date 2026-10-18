<!-- For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. — John 3:16 (KJV) -->

# Lexicon D1 before and after evidence Chirho

## Before

Fresh read-only measurements around 2026-10-18 13:40 UTC, before any production mutation:

| Measure | Result |
|---|---:|
| Worker version | `037ea83d-00c1-41d2-bcbe-02dfa7359f68` (version 2) |
| D1 rows read, trailing 24 hours | 537,943,473 |
| Worker requests, trailing 24 hours | 9,976 |
| D1 rows read per Worker request | 53,923.8 |
| D1 read queries | 51,233 |
| Visitor page requests | 10,168 |
| Visitor HTTP 200, including assets | 12,167 |
| Visitor HTTP 404 | 1,568 |
| Visitor HTTP 499 | 229 |
| Visitor HTTP 304 | 212 |

Remote `sqlite_master` contained only the lemma and reference sense indexes. `EXPLAIN QUERY PLAN` reported `SCAN s` for the hottest related-sense join. The live database counts were 14,884 lemmas, 20,311 senses, 348,858 glosses, and 174,406 references; reading those four counts directly consumed 558,459 rows.

The initially reported 9,444/9,479 HTTP 504 records were not visitor failures. Cloudflare records default Cache API misses with `requestSource=edgeWorkerCacheAPI` as status 504; the visitor-only mix above excludes those internal cache lookups.

The completed 30-minute comparison window immediately before landing, 2026-10-18 13:34–14:04 UTC, recorded 9,863,944 D1 rows, 721 read queries, and 215 Worker requests: 45,878.8 rows per request. All 215 Worker invocations succeeded. Visitor page statuses were 102 × 200, 110 × 404, 3 × 403, and 2 × 304.

## Candidate validation

- `bun test`: 7 pass, 0 fail, 25 assertions.
- `bun run check`: 0 errors and 0 warnings.
- `bun run build`: passed with the Cloudflare adapter.
- `wrangler deploy --dry-run`: passed, 505.67 KiB upload and 112.00 KiB gzip.
- `git diff --check`: passed.
- Wrangler remote migration planning showed exactly `0001_reduce_d1_reads_chirho.sql` pending.
- The additive migration applied successfully to a copy of the actual 210 MB local lexicon database.
- After that local migration, all three domain predicates used covering indexes, top lemmas used the occurrence index, distinct parts of speech used the partial POS index, the stats lookup used the integer primary key, and random selection used point lookups in the language/ordinal primary key.
- The migration derives all counts from the target database; it does not copy the slightly newer local reference count into production.
- The second independent review called the real old and candidate route modules 1,204 times and found zero returned-data differences. Mean D1 rows read fell from 24,773 to 100 for English lemma pages, 24,776 to 102 for Spanish lemma pages, 101,836 to 1,055 for English domain pages, 101,936 to 1,156 for Spanish domain pages, 618,222 to 236 for English home, and 616,257 to 349 for Spanish home. Search and the domain index remain the next miss-cost targets at about 29,778 and 102,914 rows.

## After

The reviewed commit `ee3b3af22b9bc10e2bff7d556c8f1caac1bd2654` was pushed and deployed after the additive migration. The deployed Worker version is `a736aaf6-9fcc-42a1-83a7-839839415a94`; the recorded rollback version is `037ea83d-00c1-41d2-bcbe-02dfa7359f68`.

| Equal ten-minute window | Before, 13:54–14:04 UTC | After, 14:10–14:20 UTC |
|---|---:|---:|
| D1 rows read | 3,462,208 | 12,815 |
| D1 read queries | 219 | 376 |
| Worker requests | 29 | 67 |
| D1 rows read per Worker request | 119,386.5 | 191.3 |
| Worker outcomes | 29 success | 66 success, 1 client disconnected |
| Visitor HTTP statuses | 28 × 200, 2 × 403, 1 × 404 | 61 × 200, 1 × 499, 1 × 404 |

The equal-window rows-read rate fell 99.840%, or 624.2×. After analytics ingestion settled, the independent reviewer measured the aligned 24-hour pre-deploy baseline at 537,173,150 rows across 10,097 Worker requests, or 53,201.3 rows per request. Against that robust baseline, the live post-deploy rate of 191.3 is 99.64% lower, or about 280× cheaper per request. This aligned 24-hour comparison is the headline result; the first 24-hour snapshot above and the equal ten-minute windows remain as timestamped supporting measurements.

- The migration executed 13 commands and Wrangler reports no pending migration. The remote stats row has the correct live counts, both random pools are contiguous, and all six intended indexes exist.
- English and Spanish home pages expose the unchanged counts and titles; English lemma, Spanish lemma, domain, and workers.dev probes returned 200.
- Direct production metering read one row for the stored stats lookup and 41 plus 40 rows for the two related-domain statements on the six-sense `G3588` page.
- The independent post-deploy query-shape review measured the related per-domain statement at 40.1 rows per run across 91 runs, down from 23,312 rows per run before deployment. No former full-scan shape ran in the reviewed post-deploy window.
- A fresh custom-domain lemma URL populated the cache on its first request; the next response reported `cf-cache-status: HIT`, and the repeated request was faster. The workers.dev response had no cache-control header, as designed.
- A live tail from about 14:12–14:20 UTC saw 19 natural requests on the custom domain and none on workers.dev. The only workers.dev event was an explicit probe excluded from that sample.
- The one canceled tail event corresponds to the one `clientDisconnected` Worker outcome and visitor 499. There were no visitor 5xx responses.
- The independent broader post-deploy visitor sample contained 86 × 200, 1 × 404, and 1 × 499, with no 5xx. The 9,490 pre-deploy and 63 post-deploy status-504 records in the reviewer’s windows were all `edgeWorkerCacheAPI` cache misses, not visitor responses.
- The reviewer independently confirmed the deployed version at 100%, the migration-before-deploy ordering, the six live indexes, the stats row and pools, a clean Gitleaks scan, preserved live ordering, and zero returned-content differences across 1,204 real route calls. The post-deploy verdict was PASS with nothing blocking.
- The rollback command is `bunx wrangler rollback 037ea83d-00c1-41d2-bcbe-02dfa7359f68`. The old code still runs against the additive schema, but it may cosmetically reorder tied domain-page items, so the new indexes should remain in place.

## Follow-up findings

- A pre-existing unencoded lemma link for `H????` returns 404, while `/lemma-chirho/H%3F%3F%3F%3F` returns 200. Encoding lemma IDs in generated `href` values is the next correctness fix and may remove some real visitor 404s.
- Search and the domain index remain the highest known cache-miss costs at about 29,778 and 102,914 rows. Both are edge-cached on the custom domain but not on workers.dev.
- Re-measure a full 24-hour post-deploy window on 2026-10-19, including the new heaviest query shapes.
- The configured `origin` remains `https://github.com/loveJesus/gh_chirho.git`, while GitHub reports that repository moved to `https://github.com/loveJesus/semantic-lexicon-chirho.git`. The repository is public. No remote, name, or visibility change was made; L.J. should decide whether to correct the public repository name and configured remote.

