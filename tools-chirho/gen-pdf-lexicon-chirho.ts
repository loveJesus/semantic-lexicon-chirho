// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "fs";

const LEXICON_DB_PATH_CHIRHO = "./data-chirho/lexicon-chirho.db";
const OUTPUT_DIR_CHIRHO = "./output-chirho/exports-chirho";
const JSON_PATH_CHIRHO = `${OUTPUT_DIR_CHIRHO}/lexicon-data-chirho.json`;
const PDF_PATH_CHIRHO = `${OUTPUT_DIR_CHIRHO}/lexicon-chirho.pdf`;
const TYPST_TEMPLATE_CHIRHO = "./templates-chirho/lexicon-chirho.typ";

const BOOK_NAMES_CHIRHO: Record<number, string> = {
  1: "Gen", 2: "Exod", 3: "Lev", 4: "Num", 5: "Deut",
  6: "Josh", 7: "Judg", 8: "Ruth", 9: "1Sam", 10: "2Sam",
  11: "1Kgs", 12: "2Kgs", 13: "1Chr", 14: "2Chr", 15: "Ezra",
  16: "Neh", 17: "Esth", 18: "Job", 19: "Ps", 20: "Prov",
  21: "Eccl", 22: "Song", 23: "Isa", 24: "Jer", 25: "Lam",
  26: "Ezek", 27: "Dan", 28: "Hos", 29: "Joel", 30: "Amos",
  31: "Obad", 32: "Jonah", 33: "Mic", 34: "Nah", 35: "Hab",
  36: "Zeph", 37: "Hag", 38: "Zech", 39: "Mal",
  40: "Matt", 41: "Mark", 42: "Luke", 43: "John", 44: "Acts",
  45: "Rom", 46: "1Cor", 47: "2Cor", 48: "Gal", 49: "Eph",
  50: "Phil", 51: "Col", 52: "1Thess", 53: "2Thess",
  54: "1Tim", 55: "2Tim", 56: "Titus", 57: "Phlm", 58: "Heb",
  59: "Jas", 60: "1Pet", 61: "2Pet", 62: "1John", 63: "2John",
  64: "3John", 65: "Jude", 66: "Rev",
};

interface SenseJsonChirho {
  ordinalChirho: number;
  labelChirho: string;
  descriptionChirho: string;
  enrichedChirho: string;
  occurrenceCountChirho: number;
  domainChirho: string;
  glossesChirho: Record<string, string[]>;
  referencesChirho: string[];
}

interface LemmaJsonChirho {
  lemmaIdChirho: string;
  headwordChirho: string;
  languageChirho: string;
  posChirho: string;
  glossTerseChirho: string;
  glossReadableChirho: string;
  glossCleanChirho: string;
  senseCountChirho: number;
  occurrenceCountChirho: number;
  sensesChirho: SenseJsonChirho[];
}

function extractHeadwordChirho(glossHtmlChirho: string, langChirho: string): string {
  // Hebrew/Aramaic: first <span class="lexicon-hebrew" dir="rtl">WORD</span>
  // Greek: first <span class="lexicon-greek">WORD</span>
  const classChirho = langChirho === "heb" ? "lexicon-hebrew" : "lexicon-greek";
  const reChirho = new RegExp(`<span[^>]*class="${classChirho}"[^>]*>([^<]+)</span>`);
  const matchChirho = glossHtmlChirho.match(reChirho);
  if (matchChirho) {
    return matchChirho[1].trim();
  }
  return "";
}

function formatRefChirho(
  bookChirho: number,
  chapterChirho: number,
  verseChirho: number,
): string {
  const nameChirho = BOOK_NAMES_CHIRHO[bookChirho] || `Bk${bookChirho}`;
  return `${nameChirho} ${chapterChirho}:${verseChirho}`;
}

function extractDataChirho(): LemmaJsonChirho[] {
  const dbChirho = new Database(LEXICON_DB_PATH_CHIRHO, { readonly: true });
  dbChirho.run("PRAGMA cache_size=-64000");

  const lemmasChirho = dbChirho
    .query(
      `SELECT lemma_id_chirho, language_chirho, pos_chirho,
              gloss_raw_chirho, gloss_terse_chirho, gloss_readable_chirho, gloss_clean_chirho,
              sense_count_chirho, occurrence_count_chirho
       FROM lemma_entry_chirho
       ORDER BY lemma_id_chirho`,
    )
    .all() as Record<string, any>[];

  console.log(
    `[gen-pdf-lexicon-chirho] Found ${lemmasChirho.length} lemmas`,
  );

  const sensesStmtChirho = dbChirho.prepare(
    `SELECT sense_id_chirho, ordinal_chirho, label_chirho, description_chirho,
            enriched_chirho, occurrence_count_chirho,
            community_chirho, ln_domain_chirho, macro32_chirho
     FROM sense_entry_chirho
     WHERE lemma_id_chirho = ?1
       AND (label_chirho IS NULL OR label_chirho NOT LIKE '[split]%')
     ORDER BY ordinal_chirho`,
  );

  const glossStmtChirho = dbChirho.prepare(
    `SELECT language_code_chirho, glosses_chirho
     FROM sense_gloss_chirho
     WHERE sense_id_chirho = ?1
       AND language_code_chirho IN ('eng', 'spa', 'fra', 'deu')`,
  );

  const refsStmtChirho = dbChirho.prepare(
    `SELECT book_chirho, chapter_chirho, verse_chirho
     FROM sense_reference_chirho
     WHERE sense_id_chirho = ?1
     ORDER BY book_chirho, chapter_chirho, verse_chirho
     LIMIT 5`,
  );

  const resultChirho: LemmaJsonChirho[] = [];
  let processedChirho = 0;

  for (const lemmaChirho of lemmasChirho) {
    const lemmaIdChirho = lemmaChirho.lemma_id_chirho as string;

    const sensesChirho = sensesStmtChirho.all(lemmaIdChirho) as Record<
      string,
      any
    >[];

    const senseListChirho: SenseJsonChirho[] = [];
    for (const sChirho of sensesChirho) {
      const senseIdChirho = sChirho.sense_id_chirho as number;

      // Domain: prefer community, then ln_domain, then macro32
      let domainChirho =
        (sChirho.community_chirho as string) ||
        (sChirho.ln_domain_chirho as string) ||
        (sChirho.macro32_chirho as string) ||
        "";

      // Glosses
      const glossRowsChirho = glossStmtChirho.all(senseIdChirho) as Record<
        string,
        any
      >[];
      const glossesChirho: Record<string, string[]> = {};
      for (const gChirho of glossRowsChirho) {
        try {
          const parsedChirho = JSON.parse(
            gChirho.glosses_chirho as string,
          ) as string[];
          glossesChirho[gChirho.language_code_chirho as string] =
            parsedChirho.slice(0, 3);
        } catch {
          // skip malformed
        }
      }

      // References
      const refRowsChirho = refsStmtChirho.all(senseIdChirho) as Record<
        string,
        any
      >[];
      const referencesChirho: string[] = [];
      const seenChirho = new Set<string>();
      for (const rChirho of refRowsChirho) {
        const refStrChirho = formatRefChirho(
          rChirho.book_chirho as number,
          rChirho.chapter_chirho as number,
          rChirho.verse_chirho as number,
        );
        if (!seenChirho.has(refStrChirho)) {
          seenChirho.add(refStrChirho);
          referencesChirho.push(refStrChirho);
        }
      }

      senseListChirho.push({
        ordinalChirho: sChirho.ordinal_chirho as number,
        labelChirho: (sChirho.label_chirho as string) || "",
        descriptionChirho: (sChirho.description_chirho as string) || "",
        enrichedChirho: (sChirho.enriched_chirho as string) || "",
        occurrenceCountChirho: sChirho.occurrence_count_chirho as number,
        domainChirho,
        glossesChirho,
        referencesChirho,
      });
    }

    const langChirho = lemmaChirho.language_chirho as string;
    const glossRawChirho = (lemmaChirho.gloss_raw_chirho as string) || "";
    const headwordChirho = extractHeadwordChirho(glossRawChirho, langChirho);

    resultChirho.push({
      lemmaIdChirho: lemmaIdChirho,
      headwordChirho,
      languageChirho: langChirho,
      posChirho: (lemmaChirho.pos_chirho as string) || "",
      glossTerseChirho: (lemmaChirho.gloss_terse_chirho as string) || "",
      glossReadableChirho:
        (lemmaChirho.gloss_readable_chirho as string) || "",
      glossCleanChirho: (lemmaChirho.gloss_clean_chirho as string) || "",
      senseCountChirho: lemmaChirho.sense_count_chirho as number,
      occurrenceCountChirho: lemmaChirho.occurrence_count_chirho as number,
      sensesChirho: senseListChirho,
    });

    processedChirho++;
    if (processedChirho % 3000 === 0) {
      console.log(
        `[gen-pdf-lexicon-chirho] ${processedChirho}/${lemmasChirho.length} lemmas extracted`,
      );
    }
  }

  dbChirho.close();
  return resultChirho;
}

async function mainChirho(): Promise<void> {
  mkdirSync(OUTPUT_DIR_CHIRHO, { recursive: true });

  console.log("[gen-pdf-lexicon-chirho] Extracting data from lexicon DB...");
  const dataChirho = extractDataChirho();

  console.log(
    `[gen-pdf-lexicon-chirho] Writing JSON (${dataChirho.length} lemmas)...`,
  );
  writeFileSync(JSON_PATH_CHIRHO, JSON.stringify(dataChirho));

  const fileSizeChirho = Bun.file(JSON_PATH_CHIRHO).size;
  console.log(
    `[gen-pdf-lexicon-chirho] JSON written: ${(fileSizeChirho / 1024 / 1024).toFixed(1)} MB`,
  );

  console.log("[gen-pdf-lexicon-chirho] Compiling PDF with Typst...");
  const procChirho = Bun.spawn(
    ["typst", "compile", "--root", process.cwd(), "--font-path", "assets-chirho/fonts-chirho", TYPST_TEMPLATE_CHIRHO, PDF_PATH_CHIRHO],
    {
      stdout: "inherit",
      stderr: "inherit",
      cwd: process.cwd(),
    },
  );

  const exitCodeChirho = await procChirho.exited;
  if (exitCodeChirho !== 0) {
    console.error(
      `[gen-pdf-lexicon-chirho] Typst compile failed with exit code ${exitCodeChirho}`,
    );
    process.exit(1);
  }

  const pdfSizeChirho = Bun.file(PDF_PATH_CHIRHO).size;
  console.log(
    `[gen-pdf-lexicon-chirho] PDF written: ${PDF_PATH_CHIRHO} (${(pdfSizeChirho / 1024 / 1024).toFixed(1)} MB)`,
  );
}

mainChirho();
