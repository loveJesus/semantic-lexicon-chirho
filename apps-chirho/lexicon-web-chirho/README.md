# Biblical Lexicon (lexicon-chirho)

> *"For God so loved the world that he gave his only begotten Son, that whoever believes in him should not perish but have eternal life."* — John 3:16

A computationally-derived lexicon of Biblical Hebrew, Aramaic, and Greek, deployed as a Cloudflare Worker with D1.

**Live:** [lexicon-chirho.lovejesus.workers.dev](https://lexicon-chirho.lovejesus.workers.dev)

## What is this?

Every word occurrence in Scripture (448,269 tokens across 14,884 lemmas) has been mapped through a three-stage pipeline:

1. **Token -> Sense.** Multilingual translation signatures from 43 parallel Bible translations are used to induce 20,143 lexical senses via agglomerative clustering + LLM-assisted merge review.
2. **Sense -> Domain.** Each sense is classified into a three-level semantic domain hierarchy: 32 macro-domains, 93 Louw-Nida style categories, and 1,236 fine-grained community clusters.
3. **Article composition.** For each lemma, a lexicon article is composed from the sense inventory, multilingual glosses (346,087 records across 17 display languages), domain classifications, and scripture references.

## Features

- **Bible view** -- Browse Hebrew/Greek text by chapter with lemma IDs below each word. Click any lemma to see its full entry.
- **Lexicon entries** -- BDAG/HALOT-inspired layout with sense index, domain breadcrumbs, multilingual glosses, and scripture references.
- **Domain browser** -- Three-level interactive hierarchy: Macro-32 -> Louw-Nida -> Community clusters. Drill into any domain to see its lemmas.
- **Search** -- Filter by lemma ID, gloss text, language (Hebrew/Aramaic/Greek), or part of speech.

## Stack

- **SvelteKit 2 / Svelte 5** -- Frontend framework
- **Cloudflare Workers** -- Serverless deployment
- **Cloudflare D1** -- SQLite-compatible edge database
- **Gentium Plus** -- Serif font for biblical text rendering

## Data

| Metric | Count |
|--------|-------|
| Lemmas | 14,884 |
| Senses | 20,143 |
| Gloss records | 346,087 |
| Word occurrences | 448,269 |
| Macro domains | 32 |
| L-N categories | 93 |
| Fine clusters | 1,236 |
| Languages | 43 (17 display) |

## Part of

This is the web frontend for the [semantic-chirho](https://github.com/loveJesus/gh_chirho) project -- a semantic domain mapping pipeline for Bible translations. Part of the [bible.systems](https://bible.systems) family of tools.

## Development

```bash
bun install
bunx wrangler d1 migrations apply lexicon-chirho --local
bunx wrangler dev
bun run build && bunx wrangler deploy
```

Production read-model migrations are additive and live in `migrations-chirho/`. Apply them before deploying a Worker version that reads the new summary tables. Deterministic successful read-only routes on the custom domain emit bounded cache headers; the Cloudflare adapter stores those responses in the default edge cache. The random homepage remains uncached. After any data sync, refresh both materialized read models with `bunx wrangler d1 execute lexicon-chirho --remote --file migrations-chirho/0001_reduce_d1_reads_chirho.sql` followed by `bunx wrangler d1 execute lexicon-chirho --remote --file migrations-chirho/0002_materialize_domain_reads_chirho.sql`. Request a URL- or hostname-scoped cache purge for `lexicon-chirho.bible.systems` through the zone owner; never use Purge Everything on the shared zone.

## License

Open source. See parent repository for license details.
