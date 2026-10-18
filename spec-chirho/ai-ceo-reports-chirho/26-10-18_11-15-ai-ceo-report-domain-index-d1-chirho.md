<!-- For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. — John 3:16 (KJV) -->

# AI CEO report: lexicon domain-index D1 mitigation Chirho

Preceding report:

/Users/hallelujah/dev-chirho/friends-chirho/andrewbeth-chirho/semantic-chirho/spec-chirho/ai-ceo-reports-chirho/26-10-18_10-31-ai-ceo-report-lexicon-d1-chirho.md

## Outcome

The authorized second lexicon D1 mitigation is committed, pushed, migrated, deployed, measured, and independently reviewed. Domain-index requests fell from 102,914 to 356 rows, a 99.65% reduction. The settled live 15:00–15:10 UTC window averaged 408 rows per Worker request, down 56.46% from the previous version’s clean 937-row comparison window and 99.39% from the original code’s same-clock 66,498-row window. Returned data remained identical.

## Landing and rollback

- Implementation commit: `3b96fe541d49941d7dc278882e49856d36760fb6`, pushed to `origin/main_chirho`.
- Deployed Worker version: `ea191842-e710-49d7-b2ac-98923f3ba0bc`, at 100% from 2026-10-18 14:59:52 UTC.
- Retained immediate rollback version: `a736aaf6-9fcc-42a1-83a7-839839415a94`.
- Rollback command: `bunx wrangler rollback a736aaf6-9fcc-42a1-83a7-839839415a94`.
- Migration 0002 was recorded at 14:59:24 UTC, 28 seconds before deployment. Wrangler reports no pending migrations.
- Live derived data: 33 Macro-32, 89 Louw-Nida, and 1,237 community summaries; 47,938 domain-lemma memberships; all four expected indexes.
- Gitleaks found no leaks over `9cd9a4ad..3b96fe54`; the reviewer independently reproduced the result.

## Measured D1 change

| Route class | Previous mean | New mean | New maximum |
|---|---:|---:|---:|
| Domain index | 102,914 | 356 | 356 |
| Macro-32 detail | 4,276 | 337 | 415 |
| Louw-Nida detail | 1,572 | 209 | 529 |
| Community detail | 97 | 23 | 403 |

The largest old Macro-32 detail dropped from 29,108 to 415 rows. Spanish means are 649 for Macro-32, 378 for Louw-Nida, and 45 for community detail.

Production GraphQL for 15:00–15:10 UTC measured 26,952 D1 rows over 66 Worker requests, or 408 rows per request. The prior Worker averaged 937 over 14:40–14:50 UTC and 1,261 over 14:31–14:56 UTC. The original code averaged 66,498 in the same clock window one day earlier. Against the aligned 24-hour original baseline of 53,201.3, the new ten-minute rate is 99.23% lower; a full 24-hour post-deploy comparison is due after 2026-10-19 15:00 UTC.

Every domain query was bounded in the settled window. Ranked lemma lists read 400 rows per run for 200 memberships plus 200 live lemma lookups, Spanish overlays averaged 179, children averaged 73, and the community index read 200. No former domain full scan ran. The top observed shape is now the Bible chapter page at about 1,656 rows per run; search is the last known scan route at about 30,000 rows per cache miss.

## Behavior and review

- Tests: 11 pass, 0 fail, 44 assertions.
- Svelte check: zero errors and zero warnings.
- Production build, Wrangler dry-run, and diff checks passed.
- Pre-deploy review: PASS after 0/1,762 candidate differences across complete routable-domain coverage and simulated refresh/rollback cases.
- Post-deploy review: PASS. The committed-code harness again found 0/1,762 differences against the original site, and an uncached production comparison found 11/11 identical representative results.
- All 66 Worker invocations in the settled window succeeded. Visitor status was 113 × 200 and 2 × 404, with no 5xx. The historical 504s remain Cache API miss records, not visitor failures.
- Fresh custom-domain requests cache correctly. Some custom-domain pages still serve previous-version cache entries, but output is identical, so no purge was run. workers.dev provided the uncached production parity surface.
- The reviewer’s one-time production reference checks read 318,634 plus 49,337 rows at 15:13:02–15:13:20 UTC; exclude that interval from organic-traffic comparisons.

## Follow-ups and L.J. items

1. Re-measure a full 24-hour post-deploy window after 2026-10-19 15:00 UTC, excluding the reviewer’s stated interval and including search query shapes.
2. The pre-existing unencoded `H????` href fix remains held until L.J. authorizes its deployment.
3. Per AICEO DM #2254, the local `origin` URL now points to GitHub’s already-renamed public `loveJesus/semantic-lexicon-chirho` repository. No GitHub-side setting, visibility, or name was changed in this work. The actor/provenance of the earlier GitHub-side rename was not independently established.
4. Future lexicon imports must refresh migrations 0001 and 0002 in order. The derived read-model refresh can expose an uncached sub-second 404 window if Cloudflare does not execute the file atomically; no destructive data path is involved.

## Evidence

Full before/after evidence:

/Users/hallelujah/dev-chirho/friends-chirho/andrewbeth-chirho/semantic-chirho/spec-chirho/evidence-chirho/26-10-18-domain-index-d1-before-after-chirho.md

Independent post-deploy review:

/private/tmp/claude-501/-Users-hallelujah-dev-chirho-friends-chirho-andrewbeth-chirho-semantic-chirho/5280e589-1bbb-4830-b347-fd0c306147d6/scratchpad/d1-review-chirho/review-05-domain-postdeploy-chirho.md
