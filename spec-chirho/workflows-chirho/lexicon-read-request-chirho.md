<!-- For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. — John 3:16 (KJV) -->

# Lexicon read request workflow Chirho

```mermaid
flowchart TD
  request_chirho[GET request] --> cache_key_chirho[Canonical URL cache key]
  cache_key_chirho --> cache_hit_chirho{Fresh public cache hit?}
  cache_hit_chirho -->|yes| response_chirho[Return the unchanged response]
  cache_hit_chirho -->|no| svelte_chirho[SvelteKit route load]
  svelte_chirho --> indexed_query_chirho[Use indexed D1 filters and joins]
  svelte_chirho --> summary_query_chirho[Read one immutable summary row]
  svelte_chirho --> domain_read_model_chirho[Read bounded domain summaries and ranked lemma memberships]
  indexed_query_chirho --> rendered_chirho[Render the same page data]
  summary_query_chirho --> rendered_chirho
  domain_read_model_chirho --> rendered_chirho
  rendered_chirho --> cacheable_chirho{Successful public GET?}
  cacheable_chirho -->|yes| store_chirho[Store bounded edge response]
  cacheable_chirho -->|no| response_chirho
  store_chirho --> response_chirho
```

The additive import/deploy migrations refresh the stats, random pools, domain hierarchy summaries, and ranked domain-to-lemma memberships from the authoritative source tables before the Worker version that depends on them is activated. Domain display glosses remain joined from `lemma_entry_chirho`, so a gloss-only sync does not duplicate or stale them. Failed migration or deployment leaves the previously recorded Worker version available for rollback.

