// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

/**
 * translate-glosses-chirho.ts
 *
 * Translates English lexicon glosses into target languages.
 * Does NOT use the Anthropic API — translations are done via Claude Code
 * Task subagents. This tool handles data gathering and DB writes only.
 *
 * Modes:
 *   --generate : Export prompt JSON files for Claude Code subagent processing
 *   --apply    : Read response JSON files from responses dir and write to DB
 *
 * Reads from lemma_entry_chirho + sense_entry_chirho (English glosses),
 * writes to lemma_entry_translation_chirho + sense_entry_translation_chirho.
 *
 * Usage:
 *   bun run tools-chirho/translate-glosses-chirho.ts --lang=spa --generate [--batch=20] [--offset=0]
 *   bun run tools-chirho/translate-glosses-chirho.ts --lang=spa --apply
 *   bun run tools-chirho/translate-glosses-chirho.ts --lang=spa --lemma=H2076 --generate
 *
 * Workflow:
 *   1. Run --generate to create prompt files in output-chirho/translated-glosses-chirho/prompts-{lang}/
 *   2. Process prompts via Claude Code Task subagents, save JSON responses to
 *      output-chirho/translated-glosses-chirho/responses-{lang}/{lemma_id}.json
 *   3. Run --apply to read responses and write to DB
 */

import { Database } from "bun:sqlite";
import {
  existsSync,
  appendFileSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
} from "fs";

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
const GENERATE_MODE_CHIRHO = argsChirho["generate"] === "true";
const APPLY_MODE_CHIRHO = argsChirho["apply"] === "true";

const LANG_NAME_CHIRHO =
  LANGUAGE_NAMES_CHIRHO[TARGET_LANG_CHIRHO] || TARGET_LANG_CHIRHO;
const PROGRESS_PATH_CHIRHO = `${OUTPUT_DIR_CHIRHO}/progress-${TARGET_LANG_CHIRHO}-chirho.jsonl`;
const PROMPTS_DIR_CHIRHO = `${OUTPUT_DIR_CHIRHO}/prompts-${TARGET_LANG_CHIRHO}-chirho`;
const RESPONSES_DIR_CHIRHO = `${OUTPUT_DIR_CHIRHO}/responses-${TARGET_LANG_CHIRHO}-chirho`;

interface SenseForTranslationChirho {
  senseIdChirho: number;
  ordinalChirho: number;
  labelChirho: string;
  enrichedChirho: string;
  inputGlossesChirho: string[];
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
  lemmaIdChirho: string
): TranslationResultChirho | null {
  try {
    let cleanChirho = responseChirho.trim();
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

    // Handle multiple sense key formats: senses, senses_chirho
    const sensesObjChirho =
      parsedChirho.senses || parsedChirho.senses_chirho || {};
    for (const [keyChirho, valChirho] of Object.entries(sensesObjChirho)) {
      const vChirho = valChirho as any;
      if (typeof vChirho === "string") {
        // Old format: senses_chirho: { "1": "description string" }
        // Use first sentence as label, full text as enriched
        const firstSentenceChirho =
          vChirho.split(/[:.]/)[0]?.trim().substring(0, 80) || "";
        sensesChirho[parseInt(keyChirho)] = {
          labelChirho: firstSentenceChirho,
          enrichedChirho: vChirho,
        };
      } else {
        // Object format: { label/label_chirho, enriched/enriched_chirho }
        sensesChirho[parseInt(keyChirho)] = {
          labelChirho: vChirho.label || vChirho.label_chirho || "",
          enrichedChirho: vChirho.enriched || vChirho.enriched_chirho || "",
        };
      }
    }

    // Handle multiple gloss key formats:
    // Format 1: gloss_terse_chirho / gloss_readable_chirho
    // Format 2: lemma_gloss_chirho (single field, sometimes string, sometimes object)
    // Format 3-4: gloss_terse / gloss_readable
    let terseChirho =
      parsedChirho.gloss_terse ||
      parsedChirho.gloss_terse_chirho ||
      "";
    let readableChirho =
      parsedChirho.gloss_readable ||
      parsedChirho.gloss_readable_chirho ||
      "";

    // Handle lemma_gloss_chirho which can be string or object
    if (!terseChirho && !readableChirho && parsedChirho.lemma_gloss_chirho) {
      const lgChirho = parsedChirho.lemma_gloss_chirho;
      if (typeof lgChirho === "string") {
        readableChirho = lgChirho;
      } else if (typeof lgChirho === "object") {
        terseChirho = lgChirho.terse_chirho || lgChirho.terse || "";
        readableChirho =
          lgChirho.readable_chirho || lgChirho.readable || "";
      }
    }

    // Ensure strings
    terseChirho = typeof terseChirho === "string" ? terseChirho : String(terseChirho || "");
    readableChirho = typeof readableChirho === "string" ? readableChirho : String(readableChirho || "");

    // For old format with only readable, derive terse from it
    const finalTerseChirho =
      terseChirho || (readableChirho ? readableChirho.substring(0, 150) : "");

    return {
      lemmaIdChirho,
      glossTerseChirho: finalTerseChirho,
      glossReadableChirho: readableChirho,
      sensesChirho,
    };
  } catch (errChirho) {
    console.error(
      `[translate-glosses] Failed to parse response for ${lemmaIdChirho}: ${errChirho}`
    );
    try {
      const jsonMatchChirho = responseChirho.match(/\{[\s\S]*\}/);
      if (jsonMatchChirho) {
        return parseResponseChirho(jsonMatchChirho[0], lemmaIdChirho);
      }
    } catch {}
    return null;
  }
}

function generatePromptsChirho(): void {
  mkdirSync(PROMPTS_DIR_CHIRHO, { recursive: true });
  mkdirSync(RESPONSES_DIR_CHIRHO, { recursive: true });

  const dbChirho = new Database(LEXICON_PATH_CHIRHO, { readonly: true });

  let lemmaIdsChirho: string[];

  if (SINGLE_LEMMA_CHIRHO) {
    lemmaIdsChirho = [SINGLE_LEMMA_CHIRHO];
  } else {
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

  // Filter already-done
  const doneChirho = getProgressChirho();
  lemmaIdsChirho = lemmaIdsChirho.filter(
    (idChirho) => !doneChirho.has(idChirho)
  );

  console.log(
    `[translate-glosses] Generating ${lemmaIdsChirho.length} prompts for ${LANG_NAME_CHIRHO}`
  );

  let countChirho = 0;
  for (const lemmaIdChirho of lemmaIdsChirho) {
    const ctxChirho = gatherLemmaChirho(dbChirho, lemmaIdChirho);
    if (!ctxChirho) continue;

    const promptChirho = buildPromptChirho(ctxChirho);
    const promptDataChirho = {
      lemma_id_chirho: lemmaIdChirho,
      language_chirho: TARGET_LANG_CHIRHO,
      sense_ids_chirho: ctxChirho.sensesChirho.map((sChirho) => ({
        sense_id_chirho: sChirho.senseIdChirho,
        ordinal_chirho: sChirho.ordinalChirho,
      })),
      prompt_chirho: promptChirho,
    };

    writeFileSync(
      `${PROMPTS_DIR_CHIRHO}/${lemmaIdChirho}.json`,
      JSON.stringify(promptDataChirho, null, 2)
    );
    countChirho++;
  }

  dbChirho.close();
  console.log(
    `[translate-glosses] Generated ${countChirho} prompt files in ${PROMPTS_DIR_CHIRHO}/`
  );
  console.log(
    `[translate-glosses] Process via Claude Code Task subagents, save responses to ${RESPONSES_DIR_CHIRHO}/`
  );
}

function applyResponsesChirho(): void {
  if (!existsSync(RESPONSES_DIR_CHIRHO)) {
    console.error(
      `[translate-glosses] No responses directory: ${RESPONSES_DIR_CHIRHO}`
    );
    process.exit(1);
  }

  const responseFilesChirho = readdirSync(RESPONSES_DIR_CHIRHO).filter(
    (fChirho) => fChirho.endsWith(".json")
  );

  if (responseFilesChirho.length === 0) {
    console.log("[translate-glosses] No response files to apply.");
    return;
  }

  const dbChirho = new Database(LEXICON_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");

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

  const doneChirho = getProgressChirho();
  let successCountChirho = 0;
  let failCountChirho = 0;

  dbChirho.run("BEGIN");

  for (const fileChirho of responseFilesChirho) {
    const lemmaIdChirho = fileChirho.replace(".json", "");
    if (doneChirho.has(lemmaIdChirho)) continue;

    try {
      const rawChirho = readFileSync(
        `${RESPONSES_DIR_CHIRHO}/${fileChirho}`,
        "utf-8"
      );
      const resultChirho = parseResponseChirho(rawChirho, lemmaIdChirho);
      if (!resultChirho) {
        failCountChirho++;
        continue;
      }

      // Read the prompt file to get sense_id mappings
      const promptPathChirho = `${PROMPTS_DIR_CHIRHO}/${fileChirho}`;
      let senseMapChirho: Record<number, number> = {}; // ordinal -> sense_id
      if (existsSync(promptPathChirho)) {
        const promptDataChirho = JSON.parse(
          readFileSync(promptPathChirho, "utf-8")
        );
        for (const sChirho of promptDataChirho.sense_ids_chirho || []) {
          senseMapChirho[sChirho.ordinal_chirho] = sChirho.sense_id_chirho;
        }
      } else {
        // Fallback: look up sense IDs from DB
        const sensesChirho = dbChirho
          .query(
            `SELECT sense_id_chirho, ordinal_chirho FROM sense_entry_chirho
             WHERE lemma_id_chirho = ?1 ORDER BY ordinal_chirho`
          )
          .all(lemmaIdChirho) as Record<string, any>[];
        for (const sChirho of sensesChirho) {
          senseMapChirho[sChirho.ordinal_chirho as number] =
            sChirho.sense_id_chirho as number;
        }
      }

      // Write lemma translation
      insertLemmaTransChirho.run(
        lemmaIdChirho,
        TARGET_LANG_CHIRHO,
        resultChirho.glossTerseChirho,
        resultChirho.glossReadableChirho
      );

      // Write sense translations
      for (const [ordChirho, transChirho] of Object.entries(
        resultChirho.sensesChirho
      )) {
        const senseIdChirho = senseMapChirho[parseInt(ordChirho)];
        if (senseIdChirho) {
          insertSenseTransChirho.run(
            senseIdChirho,
            TARGET_LANG_CHIRHO,
            transChirho.labelChirho,
            transChirho.enrichedChirho
          );
        }
      }

      // Log progress
      appendFileSync(
        PROGRESS_PATH_CHIRHO,
        JSON.stringify({
          lemma_id_chirho: lemmaIdChirho,
          lang_chirho: TARGET_LANG_CHIRHO,
          terse_chirho: resultChirho.glossTerseChirho,
          senses_translated_chirho: Object.keys(resultChirho.sensesChirho)
            .length,
          timestamp_chirho: new Date().toISOString(),
        }) + "\n"
      );

      successCountChirho++;
      console.log(
        `[translate-glosses] Applied ${lemmaIdChirho}: "${resultChirho.glossTerseChirho.substring(0, 60)}..."`
      );
    } catch (errChirho) {
      console.error(
        `[translate-glosses] Error applying ${fileChirho}: ${errChirho}`
      );
      failCountChirho++;
    }
  }

  dbChirho.run("COMMIT");
  dbChirho.close();

  console.log(
    `\n[translate-glosses] Applied: ${successCountChirho} to ${LANG_NAME_CHIRHO}, ${failCountChirho} failed`
  );
}

// Main
if (!GENERATE_MODE_CHIRHO && !APPLY_MODE_CHIRHO) {
  console.error(
    "[translate-glosses] ERROR: Must specify --generate or --apply mode"
  );
  console.error(
    "  --generate : Export prompts for Claude Code subagent processing"
  );
  console.error("  --apply    : Read response JSON files and write to DB");
  process.exit(1);
}

if (GENERATE_MODE_CHIRHO) {
  generatePromptsChirho();
} else {
  applyResponsesChirho();
}
