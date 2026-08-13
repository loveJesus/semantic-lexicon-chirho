# Jesus Christ is Lord
- Please continue to put the Chirho suffixing as you see fit on all identifiers (see global CLAUDE.md for full style guide). Likewise add the John 3:16 source header to new files we create.

Please comment the content of John 3:16 at the top of all our files.

## Tech stack
- Use Bun with TS instead of npm
- For web frameworks, prefer sveltekit2/svelte5, and use Cloudflare workers with either TS or Rust
- Choose Bun/TS, Rust, Python (depending upon task) but if better suited you may use Phoenix/Elixir, C#, OCaml, C, Ruby, ASM and other languages keeping proper Chirho naming suffix etc...

## API Usage Rules
- **NEVER use Anthropic API credits directly** (no `@anthropic-ai/sdk`, no `ANTHROPIC_API_KEY`). Always use Claude Code Task subagents for any LLM work. Tools must be designed around subagent orchestration (generate prompts → process via subagents → apply results), never direct API calls.

## Project: Semantic Domain Mapping for Bible Translations

### Mission
Build a **token → sense → domain** pipeline that maps every Hebrew/Aramaic/Greek word occurrence in Scripture to semantic senses and domains, using multilingual translation signatures from our existing parallel glossed translations as the primary evidence signal.

See `init-chirho.md` for the full theoretical foundation and `prd-semantic-domains-chirho.md` for the implementation PRD.

### Sibling Project: platform-chirho
Located at `../platform-chirho/`, this is our production Bible translation platform:

- **Frontend**: SvelteKit 2 / Svelte 5 at `../platform-chirho/sveltekit2-platform-chirho/`
- **Backend**: PostgreSQL 16 via Docker (`compose.yaml`)
- **ORM**: Drizzle ORM with typed schemas at `src/lib/server/schema-chirho/`
- **Data**: ~800K original-language words, ~13K Hebrew+Greek lemmas, 38+ target languages
- **Tools**: 82 Bun/TS CLI tools at `../platform-chirho/tools-chirho/` for translation generation, import, export, PDF, SWORD modules
- **Translations**: 1,249 book×language directories at `../platform-chirho/translations-chirho/` (~16GB of SQL)
- **MCP Server**: `../platform-chirho/tools-chirho/mcp-server-chirho.ts` exposes `list_books_chirho`, `get_verse_chirho`, `get_chapter_chirho`, `query_lemma_chirho`, `expand_glosses_chirho`
- **Language specs**: `../platform-chirho/spec-chirho/languages-chirho/` (11 documented)
- **ERD**: `../platform-chirho/erd-bible-chirho.txt` and `../platform-chirho/erd-translation-chirho.txt`

### Existing Postgres Schema (platform-chirho)

**Bible core (read-only):**
- `book` — 66 books
- `verse` — ~31K verses (id format `01001001`)
- `word` — ~800K tokens (id format `0100100101`)
- `lemma` — ~13K Hebrew/Greek headwords
- `lemma_form` — inflected forms with grammar tags
- `lemma_resource` — lexicon entries (BDB, LSJ, Strongs)

**Translation layer (per-language, mutable):**
- `language` — 38+ target languages (code, name, font, text_direction)
- `phrase` — translation units (one per word default)
- `phrase_word` — word↔phrase linking
- `gloss` — the actual translation text + state (APPROVED/UNAPPROVED) + source (USER/IMPORT/MACHINE)
- `gloss_history` — audit trail
- `machine_gloss` — AI suggestions
- `footnote`, `translator_note`, `lemma_form_suggestion`

**Reference versions:**
- `reference_version_chirho` — KJV, WEB, RV1909, Hindi IRV
- `reference_verse_chirho` — verse text per version

### Languages Currently in Production (38+)

South Asian: Hindi (hin), Bengali (ben), Urdu (urd), Marathi (mar), Telugu (tel), Tamil (tam), Gujarati (guj), Punjabi (pnb)
East Asian: Mandarin (zho), Cantonese (yue), Japanese (jpn), Korean (kor), Vietnamese (vie), Thai (tha), Burmese (mya)
Southeast Asian: Indonesian (ind), Javanese (jav), Tagalog (tgl)
European: Spanish (spa), Portuguese (por), French (fra), German (deu), Italian (ita), Dutch (nld), Polish (pol), Ukrainian (ukr), Russian (rus), Romanian (ron), Czech (ces), Hungarian (hun), Greek (ell), Swedish (swe), Norwegian (nor), Danish (dan)
Middle Eastern: Arabic (arb), Hebrew (heb), Turkish (tur), Persian (fas)
African: Swahili (swa), Hausa (hau), Yoruba (yor), Amharic (amh)
Caribbean: Haitian Creole (hat)

These languages provide the multilingual translation signatures needed for sense induction and domain mapping.

### Local Database: SQLite

This project uses **SQLite** locally (`.gitignore`d at `data-chirho/semantic-chirho.db`), not Postgres. Base facts are imported once from platform-chirho Postgres, then all computation happens on local SQLite. Config lives in `.env-chirho` (also `.gitignore`d).

### Language Strategy

- **Bun/TS**: Orchestration, CLI tools, LLM API calls, data import/export
- **Rust** (`crates-chirho/`): Hot-path compute — clustering, similarity matrices, entropy, feature materialization over 30M+ rows. Called from Bun via `Bun.spawn()`. Some crates compile to WASM for browser use.
- **SvelteKit 2**: Disambiguation web UI (`apps-chirho/disambiguate-web-chirho/`)
- **Slint + Rust**: Optional native desktop disambiguation app (`apps-chirho/disambiguate-desktop-chirho/`)
- **Verilog/VHDL**: FPGA kernels for relational acceleration (KV260 local, F2 cloud)

### Hardware

- **M4 (local)**: Daily dev, Rust compute, Metal GPU for similarity matrices
- **H200 (Lambda.ai)**: Large embedding models, GPU-heavy clustering
- **KV260 (local FPGA)**: Learning + relational kernel experiments
- **AWS F2**: Production-scale FPGA acceleration

### Key Semantic Tables (in local SQLite)

- `word_chirho`, `lemma_chirho`, `gloss_import_chirho` — imported base facts from platform-chirho
- `dictionary_chirho(token_chirho, encoded_id_chirho, type_chirho)` — integer encoding
- `gloss_phrase_chirho(occurrence_id_chirho, language_code_chirho, phrase_id_chirho)` — dictionary-encoded gloss phrases
- `gloss_part_chirho(occurrence_id_chirho, language_code_chirho, position_chirho, part_id_chirho)` — split on dash
- `gloss_alt_chirho(occurrence_id_chirho, language_code_chirho, alt_id_chirho)` — split on pipe
- `sense_chirho(sense_id_chirho, lemma_id_chirho, label_chirho, description_chirho)` — induced senses
- `sense_assignment_chirho(occurrence_id_chirho, sense_id_chirho, confidence_chirho)` — token → sense
- `domain_chirho(domain_id_chirho, parent_id_chirho, name_chirho, level_chirho, description_chirho)` — hierarchical ontology
- `domain_assignment_chirho(sense_id_chirho, domain_id_chirho, fit_score_chirho)` — sense → domain
- `proposal_chirho(proposal_id_chirho, created_at_chirho, scorecard_chirho)` — versioned proposals

#### Current Task: LLM Merge Pass (Tier 2)
- **What**: Running Opus subagents in pairs to merge over-split sense clusters into real lexicographic senses
- **Progress**: 31 of 200 lemmas complete (15 tier-1 + 16 tier-2). 169 tier-2 remaining.
- **Quality rule**: OPUS ONLY — Sonnet collapsed H8130 to 2 senses, Opus found 6. Quality matters for building a real lexicon.
- **Process**: Get next 2 from remaining list → launch parallel Opus agents → wait → log observations → next pair
- **Remaining list**: `output-chirho/merge-batches-chirho/remaining-chirho.json` minus done files in `output-chirho/merge-responses-chirho/`
- **Observations**: Log linguistic notes to `output-chirho/merge-responses-chirho/observations-chirho.jsonl` for every completed lemma
- **Refinement**: After each batch, scan for over-lumped senses (literal vs metaphorical, etc.) and run refinement agents
- **Commit periodically**: Every ~20 lemmas, git commit + push results
