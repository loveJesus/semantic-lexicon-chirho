<!-- For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. — John 3:16 (KJV) -->

# AI CEO report: lexicon D1 read mitigation Chirho

Preceding report: none.

## Outcome

The authorized lexicon D1 mitigation is committed, pushed, migrated, deployed, measured, and independently reviewed. Against the aligned 24-hour pre-deploy baseline, D1 rows read per Worker request fell from 53,201.3 to 191.3: 99.64% lower, or about 280× cheaper. The site’s returned data remained identical across the reviewer’s 1,204-route harness, and live page ordering was preserved.

## Landing and rollback

- Code commit: `ee3b3af22b9bc10e2bff7d556c8f1caac1bd2654` (`origin/main_chirho`).
- Deployed Worker version: `a736aaf6-9fcc-42a1-83a7-839839415a94`, at 100% from 2026-10-18 14:09:10 UTC.
- Retained rollback version: `037ea83d-00c1-41d2-bcbe-02dfa7359f68`.
- Rollback command: `bunx wrangler rollback 037ea83d-00c1-41d2-bcbe-02dfa7359f68`.
- The additive migration completed at 14:08:49 UTC, before deployment, and Wrangler reports no pending migrations. All six intended indexes, the immutable stats row, and both contiguous random pools are live.
- Gitleaks found no leaks in `d94441c7..ee3b3af2`; the reviewer independently reran the same scan with the same result.

## Measured D1 change

- Aligned 24-hour pre-deploy baseline: 537,173,150 rows / 10,097 Worker requests = 53,201.3 rows per request.
- Settled post-deploy 14:10–14:20 UTC window: 12,815 rows / 67 Worker requests = 191.3 rows per request.
- Reduction: 99.64%, about 280×.
- Hottest former query: the related per-domain statement fell from 23,312 rows per run to 40.1 across 91 post-deploy runs. No former full-scan shape ran in the reviewed post-deploy window.
- Direct live probes read one row for stored stats and 40–41 rows per related domain, including the largest domain and every domain of the six-domain lemma.

## Status and cache clarification

- Visitor-only pre-deploy 24-hour status mix: 12,167 × 200, 1,568 × 404, 229 × 499, and 212 × 304, with no visitor 5xx.
- Independent broader post-deploy sample: 86 × 200, 1 × 404, and 1 × 499, with no 5xx.
- The 9,490 pre-deploy and 63 post-deploy 504 records in the reviewer’s windows were all `requestSource=edgeWorkerCacheAPI` cache misses. They were not visitor failures.
- A fresh custom-domain URL missed at 0.39 seconds, then hit at 0.14 seconds and 0.10 seconds. The zone’s existing Browser Cache TTL rewrote the hit’s `max-age=300` to 14,400 seconds; no zone setting was changed.
- workers.dev intentionally returns no `Cache-Control`. A live natural-traffic tail saw 19 custom-domain requests and zero workers.dev requests; this is a bounded sample, not a full-day share.

## Review gates

- Pre-deploy review #2250: PASS after requested fixes, with zero output differences across 1,204 real route calls.
- Post-deploy review #2252: PASS, independently verified by read-only production calls, with nothing blocking.
- Local gates: 7 tests passed with 25 assertions; Svelte check reported zero errors and zero warnings; build, Wrangler dry-run, and `git diff --check` passed.

## Follow-ups for AICEO and L.J.

1. A pre-existing `H????` link is emitted without URI encoding, so the unencoded route returns 404 while `/lemma-chirho/H%3F%3F%3F%3F` returns 200. Fix generated lemma `href` values with `encodeURIComponent`; this may remove part of the real visitor 404 count.
2. Re-measure a full 24-hour post-deploy window on 2026-10-19, including query shapes. Search and the domain index are now the next known cache-miss costs at about 29,778 and 102,914 rows.
3. After future data syncs, refresh the stored stats and pools with `bunx wrangler d1 execute lexicon-chirho --remote --file migrations-chirho/0001_reduce_d1_reads_chirho.sql`. Any cache purge must be scoped to lexicon URLs or its hostname through AICEO/L.J.; never use Purge Everything on the shared zone.
4. The configured `origin` remains the authorized public remote `https://github.com/loveJesus/gh_chirho.git`, but GitHub says the repository moved to `https://github.com/loveJesus/semantic-lexicon-chirho.git`. No remote, name, or visibility change was made. L.J. should decide whether to correct the public repository name and configured remote.

## Evidence

Full before/after evidence:

/Users/hallelujah/dev-chirho/friends-chirho/andrewbeth-chirho/semantic-chirho/spec-chirho/evidence-chirho/26-10-18-lexicon-d1-before-after-chirho.md

Independent post-deploy review:

/private/tmp/claude-501/-Users-hallelujah-dev-chirho-friends-chirho-andrewbeth-chirho-semantic-chirho/5280e589-1bbb-4830-b347-fd0c306147d6/scratchpad/d1-review-chirho/review-03-postdeploy-chirho.md
