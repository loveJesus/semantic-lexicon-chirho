// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

/**
 * apply-glosses-chirho.ts
 *
 * Parses gloss composition response files and applies them to the lexicon DB.
 * Response files contain JSON objects separated by "---".
 *
 * Usage: bun run tools-chirho/apply-glosses-chirho.ts <response-file-or-dir>
 */

import { Database } from "bun:sqlite";
import { existsSync, readFileSync, readdirSync } from "fs";

const LEXICON_PATH_CHIRHO = "./data-chirho/lexicon-chirho.db";

interface ComposedChirho {
  lemma_id: string;
  gloss_terse: string;
  gloss_readable: string;
  senses: Record<string, string>;
}

function parseResponseFileChirho(contentChirho: string): ComposedChirho[] {
  const resultsChirho: ComposedChirho[] = [];

  // Split on --- separator
  const blocksChirho = contentChirho.split(/\n---\n|\n---$/).filter(Boolean);

  for (const blockChirho of blocksChirho) {
    let cleanChirho = blockChirho.trim();
    // Strip markdown fences
    if (cleanChirho.startsWith("```")) {
      cleanChirho = cleanChirho
        .replace(/^```(?:json)?\n?/, "")
        .replace(/\n?```$/, "");
    }
    // Find the JSON object boundaries
    const startChirho = cleanChirho.indexOf("{");
    const endChirho = cleanChirho.lastIndexOf("}");
    if (startChirho === -1 || endChirho === -1) continue;
    cleanChirho = cleanChirho.substring(startChirho, endChirho + 1);

    try {
      const parsedChirho = JSON.parse(cleanChirho) as ComposedChirho;
      if (parsedChirho.lemma_id && parsedChirho.gloss_terse) {
        resultsChirho.push(parsedChirho);
      }
    } catch (errChirho) {
      console.error(`[apply-glosses] Parse error: ${(errChirho as Error).message}`);
      // Try to extract lemma_id for debugging
      const idMatchChirho = cleanChirho.match(/"lemma_id"\s*:\s*"([^"]+)"/);
      if (idMatchChirho) {
        console.error(`  (in block for ${idMatchChirho[1]})`);
      }
    }
  }

  return resultsChirho;
}

function mainChirho(): void {
  const pathArgChirho = process.argv[2];
  if (!pathArgChirho) {
    console.error("Usage: bun run apply-glosses-chirho.ts <response-file-or-dir>");
    process.exit(1);
  }

  const dbChirho = new Database(LEXICON_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");

  // Ensure columns exist
  const colsChirho = dbChirho
    .query("PRAGMA table_info(lemma_entry_chirho)")
    .all() as Record<string, any>[];
  const colNamesChirho = colsChirho.map((cChirho) => cChirho.name as string);
  if (!colNamesChirho.includes("gloss_terse_chirho")) {
    dbChirho.run("ALTER TABLE lemma_entry_chirho ADD COLUMN gloss_terse_chirho TEXT");
  }
  if (!colNamesChirho.includes("gloss_readable_chirho")) {
    dbChirho.run("ALTER TABLE lemma_entry_chirho ADD COLUMN gloss_readable_chirho TEXT");
  }
  const senseColsChirho = dbChirho
    .query("PRAGMA table_info(sense_entry_chirho)")
    .all() as Record<string, any>[];
  if (!senseColsChirho.some((cChirho) => cChirho.name === "enriched_chirho")) {
    dbChirho.run("ALTER TABLE sense_entry_chirho ADD COLUMN enriched_chirho TEXT");
  }

  const updateLemmaChirho = dbChirho.prepare(`
    UPDATE lemma_entry_chirho
    SET gloss_terse_chirho = ?2, gloss_readable_chirho = ?3
    WHERE lemma_id_chirho = ?1
  `);
  const updateSenseChirho = dbChirho.prepare(`
    UPDATE sense_entry_chirho
    SET enriched_chirho = ?2
    WHERE lemma_id_chirho = ?1 AND ordinal_chirho = ?3
  `);

  // Collect files
  let filesChirho: string[] = [];
  const statChirho = Bun.file(pathArgChirho);
  if (existsSync(pathArgChirho)) {
    // Check if directory
    try {
      const entriesChirho = readdirSync(pathArgChirho);
      filesChirho = entriesChirho
        .filter((fChirho) => fChirho.endsWith(".json") || fChirho.endsWith(".txt"))
        .map((fChirho) => `${pathArgChirho}/${fChirho}`)
        .sort();
    } catch {
      // It's a file
      filesChirho = [pathArgChirho];
    }
  }

  if (filesChirho.length === 0) {
    console.error(`[apply-glosses] No files found at ${pathArgChirho}`);
    process.exit(1);
  }

  let totalChirho = 0;
  let appliedChirho = 0;

  dbChirho.run("BEGIN");

  for (const fileChirho of filesChirho) {
    const contentChirho = readFileSync(fileChirho, "utf-8");
    const composedChirho = parseResponseFileChirho(contentChirho);
    totalChirho += composedChirho.length;

    for (const cChirho of composedChirho) {
      updateLemmaChirho.run(
        cChirho.lemma_id,
        cChirho.gloss_terse,
        cChirho.gloss_readable
      );

      if (cChirho.senses) {
        for (const [ordChirho, textChirho] of Object.entries(cChirho.senses)) {
          updateSenseChirho.run(cChirho.lemma_id, textChirho, parseInt(ordChirho));
        }
      }

      appliedChirho++;
      console.log(
        `  ${cChirho.lemma_id}: "${cChirho.gloss_terse.substring(0, 50)}..." (${Object.keys(cChirho.senses || {}).length} senses enriched)`
      );
    }
  }

  dbChirho.run("COMMIT");

  console.log(
    `\n[apply-glosses] Applied ${appliedChirho}/${totalChirho} glosses from ${filesChirho.length} files`
  );
  dbChirho.close();
}

mainChirho();
