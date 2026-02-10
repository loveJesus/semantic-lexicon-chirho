// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

/**
 * gen-gloss-prompts-chirho.ts
 *
 * Generates prompt files for gloss composition, grouping lemmas into
 * batches of 4 for efficient subagent processing.
 *
 * Usage: bun run tools-chirho/gen-gloss-prompts-chirho.ts [--batch=4] [--count=100] [--offset=0] [--outdir=...] [--batch-start=0]
 */

import { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "fs";

const LEXICON_PATH_CHIRHO = "./data-chirho/lexicon-chirho.db";
const OUTPUT_DIR_CHIRHO = "./output-chirho/gloss-prompts-chirho";

const argsChirho = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((aChirho) => aChirho.startsWith("--"))
    .map((aChirho) => {
      const [kChirho, vChirho] = aChirho.replace("--", "").split("=");
      return [kChirho, vChirho || "true"];
    })
);
const GROUP_SIZE_CHIRHO = parseInt(argsChirho["batch"] || "4");
const COUNT_CHIRHO = parseInt(argsChirho["count"] || "100");
const OFFSET_CHIRHO = parseInt(argsChirho["offset"] || "0");
const OUTDIR_CHIRHO = argsChirho["outdir"] || OUTPUT_DIR_CHIRHO;
const BATCH_START_CHIRHO = parseInt(argsChirho["batch-start"] || "0");

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

function mainChirho(): void {
  mkdirSync(OUTDIR_CHIRHO, { recursive: true });

  const dbChirho = new Database(LEXICON_PATH_CHIRHO, { readonly: true });
  dbChirho.run("PRAGMA cache_size=-64000");

  // Get lemmas needing glosses, prioritizing polysemous + high-frequency
  const lemmasChirho = dbChirho
    .query(
      `SELECT lemma_id_chirho, language_chirho, pos_chirho,
              substr(gloss_clean_chirho, 1, 600) as bdb_snippet_chirho,
              occurrence_count_chirho, sense_count_chirho
       FROM lemma_entry_chirho
       WHERE gloss_terse_chirho IS NULL
         AND lemma_id_chirho != 'H????'
       ORDER BY sense_count_chirho DESC, occurrence_count_chirho DESC
       LIMIT ?1 OFFSET ?2`
    )
    .all(COUNT_CHIRHO, OFFSET_CHIRHO) as Record<string, any>[];

  console.log(
    `[gen-gloss-prompts] Found ${lemmasChirho.length} lemmas needing glosses`
  );

  // Build context for each lemma
  const promptsChirho: { lemmaIdChirho: string; promptBlockChirho: string }[] = [];

  for (const lemmaChirho of lemmasChirho) {
    const lemmaIdChirho = lemmaChirho.lemma_id_chirho as string;
    const langNameChirho =
      lemmaChirho.language_chirho === "grc"
        ? "Greek"
        : lemmaChirho.language_chirho === "arc"
          ? "Aramaic"
          : "Hebrew";

    const sensesChirho = dbChirho
      .query(
        `SELECT sense_id_chirho, ordinal_chirho, label_chirho, description_chirho,
                occurrence_count_chirho, community_chirho, ln_domain_chirho, macro32_chirho
         FROM sense_entry_chirho WHERE lemma_id_chirho = ?1
         ORDER BY ordinal_chirho`
      )
      .all(lemmaIdChirho) as Record<string, any>[];

    let senseLinesChirho = "";
    for (const sChirho of sensesChirho) {
      const senseIdChirho = sChirho.sense_id_chirho as number;

      // Get top glosses
      const glossRowsChirho = dbChirho
        .query(
          `SELECT language_code_chirho, glosses_chirho
           FROM sense_gloss_chirho WHERE sense_id_chirho = ?1`
        )
        .all(senseIdChirho) as Record<string, any>[];

      const glossSampleChirho: string[] = [];
      const priorityChirho = ["eng", "spa", "fra", "deu", "zho", "arb", "swa", "hin", "kor"];
      for (const langChirho of priorityChirho) {
        const rowChirho = glossRowsChirho.find(
          (gChirho) => gChirho.language_code_chirho === langChirho
        );
        if (rowChirho) {
          try {
            const gsChirho = JSON.parse(rowChirho.glosses_chirho as string)
              .slice(0, 3)
              .join(", ");
            glossSampleChirho.push(`${langChirho}: ${gsChirho}`);
          } catch {}
        }
        if (glossSampleChirho.length >= 4) break;
      }

      // Get top refs
      const refsChirho = dbChirho
        .query(
          `SELECT book_chirho, chapter_chirho, verse_chirho
           FROM sense_reference_chirho WHERE sense_id_chirho = ?1
           ORDER BY book_chirho, chapter_chirho, verse_chirho LIMIT 5`
        )
        .all(senseIdChirho) as Record<string, any>[];

      const refStrsChirho = refsChirho.map((rChirho) => {
        const bkChirho =
          BOOK_ABBREV_CHIRHO[rChirho.book_chirho as number] ||
          `Bk${rChirho.book_chirho}`;
        return `${bkChirho} ${rChirho.chapter_chirho}:${rChirho.verse_chirho}`;
      });

      senseLinesChirho += `\n  Sense ${sChirho.ordinal_chirho}: "${sChirho.label_chirho || "?"}" (${sChirho.occurrence_count_chirho}x)`;
      if (sChirho.description_chirho) {
        const descChirho =
          (sChirho.description_chirho as string).length > 200
            ? (sChirho.description_chirho as string).substring(0, 200) + "..."
            : (sChirho.description_chirho as string);
        senseLinesChirho += `\n    Desc: ${descChirho}`;
      }
      if (sChirho.macro32_chirho)
        senseLinesChirho += `\n    Domain: ${sChirho.macro32_chirho} > ${sChirho.ln_domain_chirho || ""}`;
      if (glossSampleChirho.length > 0)
        senseLinesChirho += `\n    Glosses: ${glossSampleChirho.join(" | ")}`;
      if (refStrsChirho.length > 0)
        senseLinesChirho += `\n    Refs: ${refStrsChirho.join(", ")}`;
    }

    const bdbChirho = (lemmaChirho.bdb_snippet_chirho as string) || "";
    const bdbSectionChirho = bdbChirho
      ? `\nBDB excerpt: ${bdbChirho}`
      : "";

    const blockChirho = `=== ${lemmaIdChirho} ===
Language: ${langNameChirho}, POS: ${lemmaChirho.pos_chirho || "?"}, Occurrences: ${lemmaChirho.occurrence_count_chirho}, Senses: ${sensesChirho.length}
${bdbSectionChirho}
Senses:${senseLinesChirho}`;

    promptsChirho.push({ lemmaIdChirho, promptBlockChirho: blockChirho });
  }

  // Group into batches
  const groupsChirho: typeof promptsChirho[] = [];
  for (let iChirho = 0; iChirho < promptsChirho.length; iChirho += GROUP_SIZE_CHIRHO) {
    groupsChirho.push(promptsChirho.slice(iChirho, iChirho + GROUP_SIZE_CHIRHO));
  }

  const instructionsChirho = `You are a biblical lexicographer composing glosses for a digital lexicon.
For each lemma below, compose a JSON object. Separate objects with "---".

Format for each:
{
  "lemma_id": "...",
  "gloss_terse": "under 120 chars, concise definition covering the word's semantic range",
  "gloss_readable": "2-5 sentences, 40-120 words. Don't start with 'This word'. Warm study-Bible footnote tone. Engaging, not dry.",
  "senses": {
    "1": "enriched 20-60 word description. Reference multilingual evidence when illuminating. Don't repeat the label verbatim.",
    "2": "..."
  }
}

Rules:
- No markdown fences, just JSON objects separated by ---
- Reference multilingual evidence naturally when it reveals something
- gloss_readable should feel like a good study Bible footnote: helpful, clear, occasionally surprising
- Each sense enrichment: how does the evidence support this sense? Mention 1-2 key passages when helpful.`;

  for (let gChirho = 0; gChirho < groupsChirho.length; gChirho++) {
    const groupChirho = groupsChirho[gChirho];
    const lemmaListChirho = groupChirho
      .map((pChirho) => pChirho.lemmaIdChirho)
      .join("+");

    const fullPromptChirho = `${instructionsChirho}\n\n${groupChirho.map((pChirho) => pChirho.promptBlockChirho).join("\n\n")}`;

    const batchNumChirho = gChirho + BATCH_START_CHIRHO;
    const filePathChirho = `${OUTDIR_CHIRHO}/batch-${String(batchNumChirho).padStart(4, "0")}-${lemmaListChirho}.txt`;
    writeFileSync(filePathChirho, fullPromptChirho);
  }

  console.log(
    `[gen-gloss-prompts] Generated ${groupsChirho.length} prompt files in ${OUTDIR_CHIRHO}`
  );
  dbChirho.close();
}

mainChirho();
