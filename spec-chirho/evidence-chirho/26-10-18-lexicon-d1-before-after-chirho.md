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

Pending reviewed production migration, deployment, and fresh live measurement.

