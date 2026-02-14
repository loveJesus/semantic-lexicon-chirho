// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

/**
 * translate-glosses-chirho.ts
 *
 * Translates English lexicon glosses into target languages.
 *
 * Two modes:
 *   --dry     : Print prompts without calling API (for Claude Code subagent orchestration)
 *   --apply   : Read response JSON files from output dir and write to DB
 *   (default) : Use Anthropic SDK (requires ANTHROPIC_API_KEY in env)
 *
 * Reads from lemma_entry_chirho + sense_entry_chirho (English glosses),
 * writes to lemma_entry_translation_chirho + sense_entry_translation_chirho.
 *
 * Usage:
 *   bun run tools-chirho/translate-glosses-chirho.ts --lang=spa [--batch=20] [--offset=0] [--lemma=H2076] [--dry]
 *   bun run tools-chirho/translate-glosses-chirho.ts --lang=spa --apply
 *
 * NOTE: Per project rules, prefer Claude Code Task subagents over direct API calls.
 *       Use --dry to generate prompts, process via subagents, save responses as JSON
 *       files in output-chirho/translated-glosses-chirho/responses-{lang}/, then --apply.
 */

import { Database } from "bun:sqlite";
import { existsSync, appendFileSync, readFileSync, mkdirSync } from "fs";

const LEXICON_PATH_CHIRHO = "./data-chirho/lexicon-chirho.db";
const OUTPUT_DIR_CHIRHO = "./output-chirho/translated-glosses-chirho";

// Language names for prompt context
const LANGUAGE_NAMES_CHIRHO: Record<string, string> = {
  spa: "Spanish",
  fra: "French",
  deu: "German",
  por: "Portuguese",
  ita: "Italian",
  zho: "Mandarin Chinese",
  arb: "Arabic",
  hin: "Hindi",
  kor: "Korean",
  jpn: "Japanese",
  swa: "Swahili",
  rus: "Russian",
  ind: "Indonesian",
  tha: "Thai",
  vie: "Vietnamese",
  tur: "Turkish",
  pol: "Polish",
  ukr: "Ukrainian",
  ron: "Romanian",
  nld: "Dutch",
};

// Parse CLI args
const argsChirho = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((aChirho) => aChirho.startsWith("--"))
    .map((aChirho) => {
      const [kChirho, vChirho] = aChirho.replace("--", "").split("=");
      return [kChirho, vChirho || "true"];
    })
);

const TARGET_LANG_CHIRHO = argsChirho["lang"];
if (!TARGET_LANG_CHIRHO) {
  console.error(
    "[translate-glosses] ERROR: --lang=<code> is required (e.g. --lang=spa)"
  );
  process.exit(1);
}

const BATCH_SIZE_CHIRHO = parseInt(argsChirho["batch"] || "20");
const OFFSET_CHIRHO = parseInt(argsChirho["offset"] || "0");
const SINGLE_LEMMA_CHIRHO = argsChirho["lemma"] || null;
const DRY_RUN_CHIRHO = argsChirho["dry"] === "true";
const PARALLEL_CHIRHO = parseInt(argsChirho["parallel"] || "4");

const LANG_NAME_CHIRHO =
  LANGUAGE_NAMES_CHIRHO[TARGET_LANG_CHIRHO] || TARGET_LANG_CHIRHO;
const PROGRESS_PATH_CHIRHO = `${OUTPUT_DIR_CHIRHO}/progress-${TARGET_LANG_CHIRHO}-chirho.jsonl`;

interface SenseForTranslationChirho {
  senseIdChirho: number;
  ordinalChirho: number;
  labelChirho: string;
  enrichedChirho: string;
  inputGlossesChirho: string[]; // existing target-lang glosses from sense_gloss_chirho
}

interface LemmaForTranslationChirho {
  lemmaIdChirho: string;
  glossTerseChirho: string;
  glossReadableChirho: string;
  sensesChirho: SenseForTranslationChirho[];
}

interface TranslationResultChirho {
  lemmaIdChirho: string;
  glossTerseChirho: string;
  glossReadableChirho: string;
  sensesChirho: Record<number, { labelChirho: string; enrichedChirho: string }>;
}

function getProgressChirho(): Set<string> {
  const doneChirho = new Set<string>();
  if (!existsSync(PROGRESS_PATH_CHIRHO)) return doneChirho;
  const linesChirho = readFileSync(PROGRESS_PATH_CHIRHO, "utf-8")
    .split("\n")
    .filter(Boolean);
  for (const lineChirho of linesChirho) {
    try {
      const recChirho = JSON.parse(lineChirho);
      if (recChirho.lemma_id_chirho) doneChirho.add(recChirho.lemma_id_chirho);
    } catch {}
  }
  return doneChirho;
}

function gatherLemmaChirho(
  dbChirho: Database,
  lemmaIdChirho: string
): LemmaForTranslationChirho | null {
  const lemmaChirho = dbChirho
    .query(
      `SELECT lemma_id_chirho, gloss_terse_chirho, gloss_readable_chirho
       FROM lemma_entry_chirho WHERE lemma_id_chirho = ?1`
    )
    .get(lemmaIdChirho) as Record<string, any> | null;

  if (!lemmaChirho || !lemmaChirho.gloss_terse_chirho) return null;

  const sensesChirho = dbChirho
    .query(
      `SELECT sense_id_chirho, ordinal_chirho, label_chirho, enriched_chirho
       FROM sense_entry_chirho WHERE lemma_id_chirho = ?1
       ORDER BY ordinal_chirho`
    )
    .all(lemmaIdChirho) as Record<string, any>[];

  const senseListChirho: SenseForTranslationChirho[] = [];

  for (const sChirho of sensesChirho) {
    const senseIdChirho = sChirho.sense_id_chirho as number;

    // Get existing target-language glosses for context
    const glossRowChirho = dbChirho
      .query(
        `SELECT glosses_chirho FROM sense_gloss_chirho
         WHERE sense_id_chirho = ?1 AND language_code_chirho = ?2`
      )
      .get(senseIdChirho, TARGET_LANG_CHIRHO) as Record<string, any> | null;

    let inputGlossesChirho: string[] = [];
    if (glossRowChirho) {
      try {
        inputGlossesChirho = JSON.parse(
          glossRowChirho.glosses_chirho as string
        );
      } catch {
        inputGlossesChirho = [glossRowChirho.glosses_chirho as string];
      }
    }

    senseListChirho.push({
      senseIdChirho,
      ordinalChirho: sChirho.ordinal_chirho as number,
      labelChirho: (sChirho.label_chirho as string) || "",
      enrichedChirho: (sChirho.enriched_chirho as string) || "",
      inputGlossesChirho,
    });
  }

  return {
    lemmaIdChirho,
    glossTerseChirho: lemmaChirho.gloss_terse_chirho as string,
    glossReadableChirho: lemmaChirho.gloss_readable_chirho as string,
    sensesChirho: senseListChirho,
  };
}

function buildPromptChirho(lemmaChirho: LemmaForTranslationChirho): string {
  let senseBlockChirho = "";
  for (const sChirho of lemmaChirho.sensesChirho) {
    senseBlockChirho += `\n  Sense ${sChirho.ordinalChirho}: "${sChirho.labelChirho}"`;
    if (sChirho.enrichedChirho) {
      const truncatedChirho =
        sChirho.enrichedChirho.length > 400
          ? sChirho.enrichedChirho.substring(0, 400) + "..."
          : sChirho.enrichedChirho;
      senseBlockChirho += `\n    Enriched: ${truncatedChirho}`;
    }
    if (sChirho.inputGlossesChirho.length > 0) {
      senseBlockChirho += `\n    Existing ${LANG_NAME_CHIRHO} translations: ${sChirho.inputGlossesChirho.join(", ")}`;
    }
  }

  return `You are a professional biblical lexicographer fluent in ${LANG_NAME_CHIRHO}. Translate the following English lexicon entry into ${LANG_NAME_CHIRHO}.

Lemma: ${lemmaChirho.lemmaIdChirho}

ENGLISH GLOSSES TO TRANSLATE:
  Terse gloss: "${lemmaChirho.glossTerseChirho}"
  Readable gloss: "${lemmaChirho.glossReadableChirho}"

SENSES:${senseBlockChirho}

OUTPUT (JSON only, no markdown fences):
{
  "gloss_terse": "Translated terse gloss in ${LANG_NAME_CHIRHO} — concise 1-line definition covering the word's semantic range",
  "gloss_readable": "Translated readable gloss in ${LANG_NAME_CHIRHO} — 2-5 sentence conversational explanation, same warm-but-accurate tone as the English",
  "senses": {
    "1": { "label": "Short ${LANG_NAME_CHIRHO} label for sense 1", "enriched": "Translated enriched description for sense 1 in ${LANG_NAME_CHIRHO}" },
    "2": { "label": "...", "enriched": "..." }
  }
}

RULES:
- Translate naturally into ${LANG_NAME_CHIRHO}, not word-for-word. Adapt idioms and tone.
- The "existing ${LANG_NAME_CHIRHO} translations" shown above are machine-generated glosses from our translation platform — use them as helpful context for terminology, but your translation should be independent and higher quality.
- Keep gloss_terse under 150 characters.
- Keep gloss_readable at 40-120 words.
- Each sense label should be 1-4 words.
- Each sense enriched should be 20-60 words.
- Do NOT transliterate Hebrew/Greek terms — keep them in their original script where appropriate.
- Output valid JSON only.`;
}

function parseResponseChirho(
  responseChirho: string,
  lemmaChirho: LemmaForTranslationChirho
): TranslationResultChirho | null {
  try {
    let cleanChirho = responseChirho.trim();
    // Strip markdown fences if present
    if (cleanChirho.startsWith("```")) {
      cleanChirho = cleanChirho
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const parsedChirho = JSON.parse(cleanChirho);
    const sensesChirho: Record<
      number,
      { labelChirho: string; enrichedChirho: string }
    > = {};

    if (parsedChirho.senses) {
      for (const [keyChirho, valChirho] of Object.entries(parsedChirho.senses)) {
        const vChirho = valChirho as any;
        sensesChirho[parseInt(keyChirho)] = {
          labelChirho: vChirho.label || "",
          enrichedChirho: vChirho.enriched || "",
        };
      }
    }

    return {
      lemmaIdChirho: lemmaChirho.lemmaIdChirho,
      glossTerseChirho: parsedChirho.gloss_terse || "",
      glossReadableChirho: parsedChirho.gloss_readable || "",
      sensesChirho,
    };
  } catch (errChirho) {
    console.error(
      `[translate-glosses] Failed to parse response for ${lemmaChirho.lemmaIdChirho}: ${errChirho}`
    );
    // Try to extract JSON from the response
    try {
      const jsonMatchChirho = responseChirho.match(/\{[\s\S]*\}/);
      if (jsonMatchChirho) {
        return parseResponseChirho(jsonMatchChirho[0], lemmaChirho);
      }
    } catch {}
    return null;
  }
}

async function translateOneChirho(
  lemmaChirho: LemmaForTranslationChirho
): Promise<TranslationResultChirho | null> {
  const promptChirho = buildPromptChirho(lemmaChirho);

  try {
    // Use Anthropic SDK directly (Sonnet for translation — fast + good quality)
    const { default: AnthropicChirho } = await import("@anthropic-ai/sdk");
    const clientChirho = new AnthropicChirho();

    const responseChirho = await clientChirho.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1500,
      messages: [{ role: "user", content: promptChirho }],
    });

    const textChirho =
      responseChirho.content[0].type === "text"
        ? responseChirho.content[0].text
        : "";

    return parseResponseChirho(textChirho, lemmaChirho);
  } catch (errChirho) {
    console.error(
      `[translate-glosses] Error for ${lemmaChirho.lemmaIdChirho}: ${errChirho}`
    );
    return null;
  }
}

async function mainChirho(): Promise<void> {
  mkdirSync(OUTPUT_DIR_CHIRHO, { recursive: true });

  const dbChirho = new Database(LEXICON_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");

  // Get lemmas to translate
  let lemmaIdsChirho: string[];

  if (SINGLE_LEMMA_CHIRHO) {
    lemmaIdsChirho = [SINGLE_LEMMA_CHIRHO];
  } else {
    // Get lemmas that have English glosses but no translation yet
    const rowsChirho = dbChirho
      .query(
        `SELECT le.lemma_id_chirho
         FROM lemma_entry_chirho le
         WHERE le.gloss_terse_chirho IS NOT NULL
           AND le.gloss_terse_chirho != ''
           AND NOT EXISTS (
             SELECT 1 FROM lemma_entry_translation_chirho lt
             WHERE lt.lemma_id_chirho = le.lemma_id_chirho
               AND lt.language_code_chirho = ?1
           )
         ORDER BY le.occurrence_count_chirho DESC
         LIMIT ?2 OFFSET ?3`
      )
      .all(TARGET_LANG_CHIRHO, BATCH_SIZE_CHIRHO, OFFSET_CHIRHO) as Record<
      string,
      any
    >[];
    lemmaIdsChirho = rowsChirho.map(
      (rChirho) => rChirho.lemma_id_chirho as string
    );
  }

  // Filter already-done from progress log
  const doneChirho = getProgressChirho();
  lemmaIdsChirho = lemmaIdsChirho.filter(
    (idChirho) => !doneChirho.has(idChirho)
  );

  console.log(
    `[translate-glosses] ${lemmaIdsChirho.length} lemmas to translate to ${LANG_NAME_CHIRHO} (batch=${BATCH_SIZE_CHIRHO}, offset=${OFFSET_CHIRHO})`
  );

  if (lemmaIdsChirho.length === 0) {
    console.log("[translate-glosses] Nothing to do!");
    dbChirho.close();
    return;
  }

  // Prepare insert statements
  const insertLemmaTransChirho = dbChirho.prepare(`
    INSERT OR REPLACE INTO lemma_entry_translation_chirho
    (lemma_id_chirho, language_code_chirho, gloss_terse_chirho, gloss_readable_chirho)
    VALUES (?1, ?2, ?3, ?4)
  `);

  const insertSenseTransChirho = dbChirho.prepare(`
    INSERT OR REPLACE INTO sense_entry_translation_chirho
    (sense_id_chirho, language_code_chirho, label_chirho, enriched_chirho)
    VALUES (?1, ?2, ?3, ?4)
  `);

  let successCountChirho = 0;
  let failCountChirho = 0;

  // Process in parallel batches
  for (
    let iChirho = 0;
    iChirho < lemmaIdsChirho.length;
    iChirho += PARALLEL_CHIRHO
  ) {
    const batchChirho = lemmaIdsChirho.slice(
      iChirho,
      iChirho + PARALLEL_CHIRHO
    );

    const contextsChirho = batchChirho
      .map((idChirho) => gatherLemmaChirho(dbChirho, idChirho))
      .filter(
        (cChirho): cChirho is LemmaForTranslationChirho => cChirho !== null
      );

    if (DRY_RUN_CHIRHO) {
      for (const ctxChirho of contextsChirho) {
        console.log(
          `\n--- ${ctxChirho.lemmaIdChirho} (${ctxChirho.sensesChirho.length} senses) ---`
        );
        console.log(buildPromptChirho(ctxChirho).substring(0, 500) + "...");
      }
      continue;
    }

    const resultsChirho = await Promise.all(
      contextsChirho.map((ctxChirho) => translateOneChirho(ctxChirho))
    );

    for (let jChirho = 0; jChirho < resultsChirho.length; jChirho++) {
      const resultChirho = resultsChirho[jChirho];
      if (!resultChirho) {
        failCountChirho++;
        continue;
      }

      const ctxChirho = contextsChirho[jChirho];

      // Write lemma translation
      insertLemmaTransChirho.run(
        resultChirho.lemmaIdChirho,
        TARGET_LANG_CHIRHO,
        resultChirho.glossTerseChirho,
        resultChirho.glossReadableChirho
      );

      // Write sense translations
      for (const senseChirho of ctxChirho.sensesChirho) {
        const translatedSenseChirho =
          resultChirho.sensesChirho[senseChirho.ordinalChirho];
        if (translatedSenseChirho) {
          insertSenseTransChirho.run(
            senseChirho.senseIdChirho,
            TARGET_LANG_CHIRHO,
            translatedSenseChirho.labelChirho,
            translatedSenseChirho.enrichedChirho
          );
        }
      }

      // Log progress
      appendFileSync(
        PROGRESS_PATH_CHIRHO,
        JSON.stringify({
          lemma_id_chirho: resultChirho.lemmaIdChirho,
          lang_chirho: TARGET_LANG_CHIRHO,
          terse_chirho: resultChirho.glossTerseChirho,
          senses_translated_chirho: Object.keys(resultChirho.sensesChirho)
            .length,
          timestamp_chirho: new Date().toISOString(),
        }) + "\n"
      );

      successCountChirho++;
      console.log(
        `[translate-glosses] ${successCountChirho + failCountChirho}/${lemmaIdsChirho.length} | ${resultChirho.lemmaIdChirho}: "${resultChirho.glossTerseChirho.substring(0, 60)}..."`
      );
    }
  }

  console.log(
    `\n[translate-glosses] Done: ${successCountChirho} translated to ${LANG_NAME_CHIRHO}, ${failCountChirho} failed`
  );
  dbChirho.close();
}

mainChirho().catch(console.error);
