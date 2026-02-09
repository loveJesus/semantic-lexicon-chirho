// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import { readFileSync } from "fs";

const LEXICON_PATH_CHIRHO = "./data-chirho/lexicon-chirho.db";
const OBS_PATH_CHIRHO =
  "./output-chirho/merge-responses-chirho/observations-chirho.jsonl";

interface ObservationChirho {
  lemmaIdChirho: string;
  glossChirho: string;
  sensesChirho: number;
  notesChirho: string;
}

function loadObservationsChirho(): Map<string, string> {
  const mapChirho = new Map<string, string>();
  try {
    const linesChirho = readFileSync(OBS_PATH_CHIRHO, "utf-8")
      .split("\n")
      .filter(
        (lChirho) => lChirho.trim().startsWith("{") && lChirho.includes('"lemmaIdChirho"')
      );
    for (const lineChirho of linesChirho) {
      const obsChirho: ObservationChirho = JSON.parse(lineChirho);
      mapChirho.set(obsChirho.lemmaIdChirho, obsChirho.notesChirho);
    }
  } catch (errChirho) {
    console.log(`[compose-articles-chirho] No observations file found, continuing without`);
  }
  console.log(
    `[compose-articles-chirho] Loaded ${mapChirho.size} observations`
  );
  return mapChirho;
}

function stripHtmlChirho(htmlChirho: string): string {
  return htmlChirho
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function composeArticlesChirho(): void {
  const dbChirho = new Database(LEXICON_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");

  const obsMapChirho = loadObservationsChirho();

  const lemmasChirho = dbChirho
    .query(
      "SELECT lemma_id_chirho, language_chirho, gloss_raw_chirho, gloss_clean_chirho, pos_chirho, sense_count_chirho, occurrence_count_chirho FROM lemma_entry_chirho ORDER BY lemma_id_chirho"
    )
    .all() as Record<string, any>[];

  const sensesStmtChirho = dbChirho.prepare(
    `SELECT sense_id_chirho, ordinal_chirho, label_chirho, description_chirho,
            occurrence_count_chirho, community_chirho, ln_domain_chirho, macro32_chirho
     FROM sense_entry_chirho
     WHERE lemma_id_chirho = ?1
     ORDER BY ordinal_chirho`
  );

  const glossStmtChirho = dbChirho.prepare(
    `SELECT language_code_chirho, glosses_chirho
     FROM sense_gloss_chirho
     WHERE sense_id_chirho = ?1
     ORDER BY language_code_chirho`
  );

  const refStmtChirho = dbChirho.prepare(
    `SELECT book_chirho, chapter_chirho, verse_chirho
     FROM sense_reference_chirho
     WHERE sense_id_chirho = ?1
     LIMIT 5`
  );

  const updateStmtChirho = dbChirho.prepare(
    `UPDATE lemma_entry_chirho SET article_chirho = ?2, article_format_chirho = 'markdown' WHERE lemma_id_chirho = ?1`
  );

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

  const DISPLAY_LANGS_CHIRHO = ["eng", "spa", "fra", "deu", "arb", "kor", "zho", "swa", "hin"];

  dbChirho.run("BEGIN");
  let countChirho = 0;

  for (const lemmaChirho of lemmasChirho) {
    const idChirho = lemmaChirho.lemma_id_chirho as string;
    const glossCleanChirho = lemmaChirho.gloss_clean_chirho as string || "";
    const posChirho = lemmaChirho.pos_chirho as string || "";
    const langChirho = lemmaChirho.language_chirho === "grc" ? "Greek" : "Hebrew";
    const occChirho = lemmaChirho.occurrence_count_chirho as number;
    const senseCountChirho = lemmaChirho.sense_count_chirho as number;

    const sensesChirho = sensesStmtChirho.all(idChirho) as Record<string, any>[];

    // Build article
    const partsChirho: string[] = [];

    // Header
    partsChirho.push(`## ${idChirho} — ${glossCleanChirho}`);
    partsChirho.push(
      `*${langChirho} ${posChirho || ""}* | ${occChirho} occurrences | ${senseCountChirho} sense${senseCountChirho !== 1 ? "s" : ""}`
    );
    partsChirho.push("");

    // Senses
    for (const sChirho of sensesChirho) {
      const senseIdChirho = sChirho.sense_id_chirho as number;
      const labelChirho = sChirho.label_chirho as string;
      const descChirho = sChirho.description_chirho as string;
      const sOccChirho = sChirho.occurrence_count_chirho as number;
      const ordChirho = sChirho.ordinal_chirho as number;

      // Sense heading
      if (labelChirho) {
        partsChirho.push(
          `### ${ordChirho}. ${labelChirho} (${sOccChirho} occ.)`
        );
      } else {
        partsChirho.push(`### ${ordChirho}. Sense ${senseIdChirho} (${sOccChirho} occ.)`);
      }

      if (descChirho) {
        partsChirho.push(descChirho);
      }
      partsChirho.push("");

      // Domain breadcrumb
      const macroChirho = sChirho.macro32_chirho as string;
      const lnChirho = sChirho.ln_domain_chirho as string;
      const commChirho = sChirho.community_chirho as string;
      if (macroChirho || lnChirho) {
        const crumbChirho = [macroChirho, lnChirho, commChirho]
          .filter(Boolean)
          .map((sChirho) => (sChirho as string).replace(/_/g, " ").replace(/^LN\d+\s*/, ""))
          .join(" > ");
        partsChirho.push(`**Domain:** ${crumbChirho}`);
      }

      // Multilingual glosses
      const glossRowsChirho = glossStmtChirho.all(senseIdChirho) as Record<string, any>[];
      const glossPartsChirho: string[] = [];
      for (const gChirho of glossRowsChirho) {
        const lcChirho = gChirho.language_code_chirho as string;
        if (!DISPLAY_LANGS_CHIRHO.includes(lcChirho)) continue;
        try {
          const phrasesChirho = JSON.parse(gChirho.glosses_chirho as string) as string[];
          if (phrasesChirho.length > 0) {
            glossPartsChirho.push(
              `${lcChirho}: ${phrasesChirho.slice(0, 3).join(", ")}`
            );
          }
        } catch {}
      }
      if (glossPartsChirho.length > 0) {
        partsChirho.push(`**Glosses:** ${glossPartsChirho.join(" | ")}`);
      }

      // Sample references
      const refsChirho = refStmtChirho.all(senseIdChirho) as Record<string, any>[];
      if (refsChirho.length > 0) {
        const refStrsChirho = refsChirho.map((rChirho) => {
          const bookChirho = BOOK_NAMES_CHIRHO[rChirho.book_chirho as number] || `${rChirho.book_chirho}`;
          return `${bookChirho} ${rChirho.chapter_chirho}:${rChirho.verse_chirho}`;
        });
        partsChirho.push(`**Refs:** ${refStrsChirho.join("; ")}`);
      }

      partsChirho.push("");
    }

    // Linguistic notes from observations
    const notesChirho = obsMapChirho.get(idChirho);
    if (notesChirho) {
      partsChirho.push(`### Notes`);
      partsChirho.push(notesChirho);
      partsChirho.push("");
    }

    const articleChirho = partsChirho.join("\n");
    updateStmtChirho.run(idChirho, articleChirho);

    countChirho++;
    if (countChirho % 2000 === 0) {
      dbChirho.run("COMMIT");
      dbChirho.run("BEGIN");
      console.log(
        `[compose-articles-chirho] ${countChirho}/${lemmasChirho.length} articles composed`
      );
    }
  }

  dbChirho.run("COMMIT");

  // Stats
  const withArticleChirho = (
    dbChirho
      .query("SELECT COUNT(*) as c FROM lemma_entry_chirho WHERE article_chirho IS NOT NULL")
      .get() as any
  ).c;
  const withNotesChirho = (
    dbChirho
      .query("SELECT COUNT(*) as c FROM lemma_entry_chirho WHERE article_chirho LIKE '%### Notes%'")
      .get() as any
  ).c;

  console.log(`\n[compose-articles-chirho] === ARTICLE STATS ===`);
  console.log(`  Total articles:    ${withArticleChirho}`);
  console.log(`  With observations: ${withNotesChirho}`);
  console.log(
    `  Avg article size:  ${Math.round((dbChirho.query("SELECT AVG(LENGTH(article_chirho)) as a FROM lemma_entry_chirho WHERE article_chirho IS NOT NULL").get() as any).a)} chars`
  );

  dbChirho.close();
}

composeArticlesChirho();
