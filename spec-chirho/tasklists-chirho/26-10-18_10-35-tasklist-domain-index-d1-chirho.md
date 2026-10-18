<!-- For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. — John 3:16 (KJV) -->

# Domain-index D1 read mitigation Chirho

- [x] Record the wider-window baseline, inspect the dominant domain-index query shapes, and update the local `origin` URL without changing GitHub state.
- [x] Design an additive materialized domain-index read model that refreshes safely after lexicon imports.
- [x] Update the domain-index route, generator, tests, documentation, and workflow without changing rendered data or order.
- [x] Apply the migration to a copy of the real lexicon database and meter old versus candidate queries with exact parity checks.
- [x] Run tests, Svelte checks, build, dry deployment, diff checks, and a Gitleaks scan.
- [x] Request and resolve an independent pre-deploy review from SEMANTIC_CHIRHO/claude2_chirho.
- [x] Commit and push explicit owned paths, record the current Worker version, apply the additive remote migration, and deploy.
- [x] Measure live D1 rows per request and dominant query shapes, verify page/cache behavior, and request post-deploy review.
- [x] Complete the evidence, progress row, consolidated AICEO report, final evidence commit, and AICEO DM.
