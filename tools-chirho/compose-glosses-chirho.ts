// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

/**
 * compose-glosses-chirho.ts
 *
 * Composes our own glosses for lemmas and enriched descriptions for senses.
 * Uses Claude subagents via Task to generate:
 *   - gloss_terse_chirho: 1-line concise definition (like HALOT/BDB but ours)
 *   - gloss_readable_chirho: 2-5 sentence conversational explanation
 *   - enriched_chirho: per-sense enriched description
 *
 * All stored in separate columns from existing data.
 *
 * Usage: bun run tools-chirho/compose-glosses-chirho.ts [--batch=50] [--offset=0] [--lemma=H2076]
 */

import { Database } from "bun:sqlite";
import { existsSync, appendFileSync, readFileSync } from "fs";
import Anthropic from "@anthropic-ai/sdk";

const LEXICON_PATH_CHIRHO = "./data-chirho/lexicon-chirho.db";
const SEMANTIC_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";
const OUTPUT_DIR_CHIRHO = "./output-chirho/composed-glosses-chirho";
const PROGRESS_PATH_CHIRHO = `${OUTPUT_DIR_CHIRHO}/progress-chirho.jsonl`;

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
const BATCH_SIZE_CHIRHO = parseInt(argsChirho["batch"] || "20");
const OFFSET_CHIRHO = parseInt(argsChirho["offset"] || "0");
const SINGLE_LEMMA_CHIRHO = argsChirho["lemma"] || null;
const DRY_RUN_CHIRHO = argsChirho["dry"] === "true";

interface SenseContextChirho {
  ordinalChirho: number;
  labelChirho: string;
  descriptionChirho: string;
  occCountChirho: number;
  macroChirho: string;
  lnChirho: string;
  communityChirho: string;
  glossesChirho: Record<string, string[]>;
  topRefsChirho: string[];
}

interface LemmaContextChirho {
  lemmaIdChirho: string;
  languageChirho: string;
  posChirho: string;
  bdbSnippetChirho: string;
  totalOccChirho: number;
  sensesChirho: SenseContextChirho[];
}

interface ComposedGlossChirho {
  lemmaIdChirho: string;
  glossTerseChirho: string;
  glossReadableChirho: string;
  senseEnrichedChirho: Record<number, string>; // ordinal -> enriched text
}

function ensureSchemaMigrationChirho(dbChirho: Database): void {
  // Add columns if they don't exist
  const colsLemmaChirho = dbChirho
    .query("PRAGMA table_info(lemma_entry_chirho)")
    .all() as Record<string, any>[];
  const lemmaColNamesChirho = colsLemmaChirho.map(
    (cChirho) => cChirho.name as string
  );

  if (!lemmaColNamesChirho.includes("gloss_terse_chirho")) {
    dbChirho.run(
      "ALTER TABLE lemma_entry_chirho ADD COLUMN gloss_terse_chirho TEXT"
    );
    console.log("[compose-glosses] Added gloss_terse_chirho to lemma_entry_chirho");
  }
  if (!lemmaColNamesChirho.includes("gloss_readable_chirho")) {
    dbChirho.run(
      "ALTER TABLE lemma_entry_chirho ADD COLUMN gloss_readable_chirho TEXT"
    );
    console.log(
      "[compose-glosses] Added gloss_readable_chirho to lemma_entry_chirho"
    );
  }

  const colsSenseChirho = dbChirho
    .query("PRAGMA table_info(sense_entry_chirho)")
    .all() as Record<string, any>[];
  const senseColNamesChirho = colsSenseChirho.map(
    (cChirho) => cChirho.name as string
  );

  if (!senseColNamesChirho.includes("enriched_chirho")) {
    dbChirho.run(
      "ALTER TABLE sense_entry_chirho ADD COLUMN enriched_chirho TEXT"
    );
    console.log("[compose-glosses] Added enriched_chirho to sense_entry_chirho");
  }
}

function gatherLemmaContextChirho(
  lexDbChirho: Database,
  lemmaIdChirho: string
): LemmaContextChirho | null {
  const lemmaChirho = lexDbChirho
    .query(
      `SELECT lemma_id_chirho, language_chirho, pos_chirho,
              gloss_clean_chirho, occurrence_count_chirho
       FROM lemma_entry_chirho WHERE lemma_id_chirho = ?1`
    )
    .get(lemmaIdChirho) as Record<string, any> | null;

  if (!lemmaChirho) return null;

  const bdbRawChirho = (lemmaChirho.gloss_clean_chirho as string) || "";
  // Take first ~600 chars of BDB for context (enough for the key info)
  const bdbSnippetChirho =
    bdbRawChirho.length > 600
      ? bdbRawChirho.substring(0, 600).trimEnd() + "..."
      : bdbRawChirho;

  const sensesChirho = lexDbChirho
    .query(
      `SELECT sense_id_chirho, ordinal_chirho, label_chirho, description_chirho,
              occurrence_count_chirho, community_chirho, ln_domain_chirho, macro32_chirho
       FROM sense_entry_chirho WHERE lemma_id_chirho = ?1
       ORDER BY ordinal_chirho`
    )
    .all(lemmaIdChirho) as Record<string, any>[];

  const senseContextsChirho: SenseContextChirho[] = [];

  for (const sChirho of sensesChirho) {
    const senseIdChirho = sChirho.sense_id_chirho as number;

    // Get glosses for this sense
    const glossRowsChirho = lexDbChirho
      .query(
        `SELECT language_code_chirho, glosses_chirho
         FROM sense_gloss_chirho WHERE sense_id_chirho = ?1`
      )
      .all(senseIdChirho) as Record<string, any>[];

    const glossesChirho: Record<string, string[]> = {};
    for (const gChirho of glossRowsChirho) {
      try {
        glossesChirho[gChirho.language_code_chirho as string] = JSON.parse(
          gChirho.glosses_chirho as string
        );
      } catch {
        glossesChirho[gChirho.language_code_chirho as string] = [
          gChirho.glosses_chirho as string,
        ];
      }
    }

    // Get a few top references
    const refsChirho = lexDbChirho
      .query(
        `SELECT book_chirho, chapter_chirho, verse_chirho
         FROM sense_reference_chirho WHERE sense_id_chirho = ?1
         ORDER BY book_chirho, chapter_chirho, verse_chirho
         LIMIT 5`
      )
      .all(senseIdChirho) as Record<string, any>[];

    const BOOK_ABBREV_CHIRHO: Record<number, string> = {
      1: "Gen",2: "Exod",3: "Lev",4: "Num",5: "Deut",6: "Josh",7: "Judg",8: "Ruth",
      9: "1Sam",10: "2Sam",11: "1Kgs",12: "2Kgs",13: "1Chr",14: "2Chr",15: "Ezra",
      16: "Neh",17: "Esth",18: "Job",19: "Ps",20: "Prov",21: "Eccl",22: "Song",
      23: "Isa",24: "Jer",25: "Lam",26: "Ezek",27: "Dan",28: "Hos",29: "Joel",
      30: "Amos",31: "Obad",32: "Jonah",33: "Mic",34: "Nah",35: "Hab",36: "Zeph",
      37: "Hag",38: "Zech",39: "Mal",40: "Matt",41: "Mark",42: "Luke",43: "John",
      44: "Acts",45: "Rom",46: "1Cor",47: "2Cor",48: "Gal",49: "Eph",50: "Phil",
      51: "Col",52: "1Thess",53: "2Thess",54: "1Tim",55: "2Tim",56: "Titus",
      57: "Phlm",58: "Heb",59: "Jas",60: "1Pet",61: "2Pet",62: "1John",63: "2John",
      64: "3John",65: "Jude",66: "Rev",
    };

    const topRefsChirho = refsChirho.map((rChirho) => {
      const bookChirho = BOOK_ABBREV_CHIRHO[rChirho.book_chirho as number] || `Bk${rChirho.book_chirho}`;
      return `${bookChirho} ${rChirho.chapter_chirho}:${rChirho.verse_chirho}`;
    });

    senseContextsChirho.push({
      ordinalChirho: sChirho.ordinal_chirho as number,
      labelChirho: (sChirho.label_chirho as string) || "",
      descriptionChirho: (sChirho.description_chirho as string) || "",
      occCountChirho: sChirho.occurrence_count_chirho as number,
      macroChirho: (sChirho.macro32_chirho as string) || "",
      lnChirho: (sChirho.ln_domain_chirho as string) || "",
      communityChirho: (sChirho.community_chirho as string) || "",
      glossesChirho,
      topRefsChirho,
    });
  }

  return {
    lemmaIdChirho,
    languageChirho: lemmaChirho.language_chirho as string,
    posChirho: (lemmaChirho.pos_chirho as string) || "",
    bdbSnippetChirho,
    totalOccChirho: lemmaChirho.occurrence_count_chirho as number,
    sensesChirho: senseContextsChirho,
  };
}

function buildPromptChirho(ctxChirho: LemmaContextChirho): string {
  const langNameChirho =
    ctxChirho.languageChirho === "grc"
      ? "Greek"
      : ctxChirho.languageChirho === "arc"
        ? "Aramaic"
        : "Hebrew";

  let senseLinesChirho = "";
  for (const sChirho of ctxChirho.sensesChirho) {
    // Pick top 3-4 languages for gloss display
    const glossSampleChirho: string[] = [];
    const priorityLangsChirho = ["eng", "spa", "fra", "deu", "zho", "arb", "swa", "hin", "kor", "jpn"];
    for (const langChirho of priorityLangsChirho) {
      if (sChirho.glossesChirho[langChirho]) {
        const gsChirho = sChirho.glossesChirho[langChirho].slice(0, 3).join(", ");
        glossSampleChirho.push(`${langChirho}: ${gsChirho}`);
      }
      if (glossSampleChirho.length >= 4) break;
    }

    senseLinesChirho += `\n  Sense ${sChirho.ordinalChirho}: "${sChirho.labelChirho}" (${sChirho.occCountChirho}x)`;
    if (sChirho.descriptionChirho) {
      // Truncate very long descriptions
      const descChirho = sChirho.descriptionChirho.length > 300
        ? sChirho.descriptionChirho.substring(0, 300) + "..."
        : sChirho.descriptionChirho;
      senseLinesChirho += `\n    Description: ${descChirho}`;
    }
    if (sChirho.macroChirho) senseLinesChirho += `\n    Domain: ${sChirho.macroChirho} > ${sChirho.lnChirho}`;
    if (glossSampleChirho.length > 0)
      senseLinesChirho += `\n    Glosses: ${glossSampleChirho.join(" | ")}`;
    if (sChirho.topRefsChirho.length > 0)
      senseLinesChirho += `\n    Refs: ${sChirho.topRefsChirho.join(", ")}`;
  }

  const bdbSectionChirho = ctxChirho.bdbSnippetChirho
    ? `\nBDB/Lexicon excerpt:\n  ${ctxChirho.bdbSnippetChirho}`
    : "";

  return `You are a biblical lexicographer composing glosses for a digital lexicon of ${langNameChirho} Scripture.

Lemma: ${ctxChirho.lemmaIdChirho}
Language: ${langNameChirho}
POS: ${ctxChirho.posChirho}
Total occurrences: ${ctxChirho.totalOccChirho}
Number of senses: ${ctxChirho.sensesChirho.length}
${bdbSectionChirho}

Senses:${senseLinesChirho}

Please compose the following (output ONLY the JSON, no markdown fences):

{
  "gloss_terse": "A concise 1-line definition covering the word's semantic range. Like a dictionary headword entry. Example: 'face, presence, surface; the front or visible aspect of something; by extension, one\\'s presence or attention'",
  "gloss_readable": "A 2-5 sentence conversational explanation of how this word works in Scripture. Write for an educated reader who isn't a Hebrew/Greek scholar. Mention the key senses naturally, note any interesting patterns (e.g. 'when used with God, it typically means his presence or favor'). Make it engaging to read -- not a dry list of definitions but a brief essay that helps someone understand and appreciate the word. Don't start with 'This word...' or 'The word...' -- start with the meaning directly.",
  "senses": {
    "1": "An enriched 1-2 sentence description for sense 1. Include how the multilingual evidence supports this sense and mention 1-2 key passages where this meaning is clear. Don't repeat the label verbatim.",
    "2": "Same for sense 2...",
  }
}

Rules:
- gloss_terse should be under 120 characters
- gloss_readable should be 40-120 words, warm but accurate
- Each sense enrichment should be 20-60 words
- Don't invent information not supported by the data above
- Reference the multilingual evidence naturally when it's illuminating (e.g. "the Swahili distinction between X and Y confirms...")
- For the readable gloss, aim for the tone of a good study Bible footnote: helpful, clear, occasionally surprising
- Output valid JSON only`;
}

function parseResponseChirho(
  responseChirho: string,
  ctxChirho: LemmaContextChirho
): ComposedGlossChirho | null {
  try {
    // Strip markdown fences if present
    let cleanChirho = responseChirho.trim();
    if (cleanChirho.startsWith("```")) {
      cleanChirho = cleanChirho
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }

    const parsedChirho = JSON.parse(cleanChirho);

    const senseEnrichedChirho: Record<number, string> = {};
    if (parsedChirho.senses) {
      for (const [keyChirho, valChirho] of Object.entries(parsedChirho.senses)) {
        senseEnrichedChirho[parseInt(keyChirho)] = valChirho as string;
      }
    }

    return {
      lemmaIdChirho: ctxChirho.lemmaIdChirho,
      glossTerseChirho: parsedChirho.gloss_terse || "",
      glossReadableChirho: parsedChirho.gloss_readable || "",
      senseEnrichedChirho,
    };
  } catch (errChirho) {
    console.error(
      `[compose-glosses] Failed to parse response for ${ctxChirho.lemmaIdChirho}: ${errChirho}`
    );
    return null;
  }
}

function getCompletedLemmasChirho(): Set<string> {
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

async function composeOneChirho(
  clientChirho: Anthropic,
  ctxChirho: LemmaContextChirho
): Promise<ComposedGlossChirho | null> {
  const promptChirho = buildPromptChirho(ctxChirho);

  try {
    const responseChirho = await clientChirho.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1500,
      messages: [{ role: "user", content: promptChirho }],
    });

    const textChirho =
      responseChirho.content[0].type === "text"
        ? responseChirho.content[0].text
        : "";
    return parseResponseChirho(textChirho, ctxChirho);
  } catch (errChirho) {
    console.error(
      `[compose-glosses] API error for ${ctxChirho.lemmaIdChirho}: ${errChirho}`
    );
    return null;
  }
}

async function mainChirho(): Promise<void> {
  // Ensure output directory
  const { mkdirSync: mkdirChirho } = await import("fs");
  mkdirChirho(OUTPUT_DIR_CHIRHO, { recursive: true });

  const lexDbChirho = new Database(LEXICON_PATH_CHIRHO);
  lexDbChirho.run("PRAGMA journal_mode=WAL");
  ensureSchemaMigrationChirho(lexDbChirho);

  const clientChirho = new Anthropic();

  // Get lemmas to process
  let lemmaIdsChirho: string[];

  if (SINGLE_LEMMA_CHIRHO) {
    lemmaIdsChirho = [SINGLE_LEMMA_CHIRHO];
  } else {
    // Process polysemous lemmas first (more value), then monosemous
    const rowsChirho = lexDbChirho
      .query(
        `SELECT lemma_id_chirho FROM lemma_entry_chirho
         WHERE gloss_terse_chirho IS NULL
         ORDER BY sense_count_chirho DESC, occurrence_count_chirho DESC
         LIMIT ?1 OFFSET ?2`
      )
      .all(BATCH_SIZE_CHIRHO, OFFSET_CHIRHO) as Record<string, any>[];
    lemmaIdsChirho = rowsChirho.map((rChirho) => rChirho.lemma_id_chirho as string);
  }

  // Filter already-done from progress log
  const doneChirho = getCompletedLemmasChirho();
  lemmaIdsChirho = lemmaIdsChirho.filter((idChirho) => !doneChirho.has(idChirho));

  console.log(
    `[compose-glosses] ${lemmaIdsChirho.length} lemmas to process (batch=${BATCH_SIZE_CHIRHO}, offset=${OFFSET_CHIRHO})`
  );

  if (lemmaIdsChirho.length === 0) {
    console.log("[compose-glosses] Nothing to do!");
    lexDbChirho.close();
    return;
  }

  // Prepare update statements
  const updateLemmaChirho = lexDbChirho.prepare(`
    UPDATE lemma_entry_chirho
    SET gloss_terse_chirho = ?2, gloss_readable_chirho = ?3
    WHERE lemma_id_chirho = ?1
  `);
  const updateSenseChirho = lexDbChirho.prepare(`
    UPDATE sense_entry_chirho
    SET enriched_chirho = ?2
    WHERE lemma_id_chirho = ?1 AND ordinal_chirho = ?3
  `);

  let successCountChirho = 0;
  let failCountChirho = 0;

  // Process in small parallel batches (4 at a time to respect rate limits)
  const PARALLEL_CHIRHO = 4;

  for (let iChirho = 0; iChirho < lemmaIdsChirho.length; iChirho += PARALLEL_CHIRHO) {
    const batchChirho = lemmaIdsChirho.slice(iChirho, iChirho + PARALLEL_CHIRHO);

    const contextsChirho = batchChirho
      .map((idChirho) => gatherLemmaContextChirho(lexDbChirho, idChirho))
      .filter((cChirho): cChirho is LemmaContextChirho => cChirho !== null);

    if (DRY_RUN_CHIRHO) {
      for (const ctxChirho of contextsChirho) {
        console.log(`\n--- ${ctxChirho.lemmaIdChirho} (${ctxChirho.sensesChirho.length} senses) ---`);
        console.log(buildPromptChirho(ctxChirho).substring(0, 500) + "...");
      }
      continue;
    }

    const resultsChirho = await Promise.all(
      contextsChirho.map((ctxChirho) => composeOneChirho(clientChirho, ctxChirho))
    );

    for (const resultChirho of resultsChirho) {
      if (!resultChirho) {
        failCountChirho++;
        continue;
      }

      // Write to DB
      updateLemmaChirho.run(
        resultChirho.lemmaIdChirho,
        resultChirho.glossTerseChirho,
        resultChirho.glossReadableChirho
      );

      for (const [ordChirho, textChirho] of Object.entries(
        resultChirho.senseEnrichedChirho
      )) {
        updateSenseChirho.run(
          resultChirho.lemmaIdChirho,
          textChirho,
          parseInt(ordChirho)
        );
      }

      // Log progress
      appendFileSync(
        PROGRESS_PATH_CHIRHO,
        JSON.stringify({
          lemma_id_chirho: resultChirho.lemmaIdChirho,
          terse_chirho: resultChirho.glossTerseChirho,
          readable_len_chirho: resultChirho.glossReadableChirho.length,
          senses_enriched_chirho: Object.keys(resultChirho.senseEnrichedChirho).length,
          timestamp_chirho: new Date().toISOString(),
        }) + "\n"
      );

      successCountChirho++;
      console.log(
        `[compose-glosses] ${successCountChirho + failCountChirho}/${lemmaIdsChirho.length} | ${resultChirho.lemmaIdChirho}: "${resultChirho.glossTerseChirho.substring(0, 60)}..."`
      );
    }
  }

  console.log(
    `\n[compose-glosses] Done: ${successCountChirho} composed, ${failCountChirho} failed`
  );
  lexDbChirho.close();
}

mainChirho().catch(console.error);
