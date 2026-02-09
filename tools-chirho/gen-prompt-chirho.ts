// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import {
  extractLemmaSummaryChirho,
  formatPromptChirho,
} from "./merge-senses-llm-chirho";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";
const lemmaIdChirho = process.argv[2];

if (!lemmaIdChirho) {
  console.error("Usage: bun run gen-prompt-chirho.ts <lemma_id>");
  process.exit(1);
}

const dbChirho = new Database(SQLITE_PATH_CHIRHO, { readonly: true });
const summaryChirho = extractLemmaSummaryChirho(dbChirho, lemmaIdChirho);
dbChirho.close();

if (!summaryChirho) {
  console.error(`No data for lemma ${lemmaIdChirho}`);
  process.exit(1);
}

console.log(formatPromptChirho(summaryChirho));
