// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import Anthropic from "@anthropic-ai/sdk";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";
const ANTHROPIC_API_KEY_CHIRHO =
  process.env.ANTHROPIC_API_KEY_CHIRHO || process.env.ANTHROPIC_API_KEY || "";
const BATCH_SIZE_CHIRHO = 20;
const RATE_LIMIT_DELAY_CHIRHO = 1200; // ~50 req/min = 1.2s between batches

const DIVERSE_LANGS_CHIRHO = ["eng", "spa", "arb", "hin", "swa", "kor"];

interface SenseRowChirho {
  senseIdChirho: number;
  lemmaIdChirho: string;
}

async function labelSensesChirho(): Promise<void> {
  const dbChirho = new Database(SQLITE_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");
  dbChirho.run("PRAGMA synchronous=NORMAL");

  // Get all senses without labels
  const unlabeledChirho: any[] = dbChirho
    .query(
      `SELECT sense_id_chirho, lemma_id_chirho
       FROM sense_chirho
       WHERE label_chirho IS NULL
       ORDER BY sense_id_chirho`
    )
    .all();

  console.log(
    `[label-senses-chirho] Found ${unlabeledChirho.length} unlabeled senses`
  );

  if (unlabeledChirho.length === 0) {
    console.log("[label-senses-chirho] Nothing to label. Done.");
    dbChirho.close();
    return;
  }

  if (!ANTHROPIC_API_KEY_CHIRHO) {
    console.error(
      "[label-senses-chirho] No ANTHROPIC_API_KEY found. Set ANTHROPIC_API_KEY_CHIRHO or ANTHROPIC_API_KEY in .env-chirho"
    );
    process.exit(1);
  }

  const clientChirho = new Anthropic({ apiKey: ANTHROPIC_API_KEY_CHIRHO });

  const updateStmtChirho = dbChirho.prepare(
    `UPDATE sense_chirho
     SET label_chirho = ?1,
         description_chirho = ?2,
         cluster_method_chirho = COALESCE(cluster_method_chirho, '') || '+llm_label',
         updated_at_chirho = datetime('now')
     WHERE sense_id_chirho = ?3`
  );

  let labeledChirho = 0;
  let failedChirho = 0;

  // Process in batches
  for (
    let iChirho = 0;
    iChirho < unlabeledChirho.length;
    iChirho += BATCH_SIZE_CHIRHO
  ) {
    const batchChirho = unlabeledChirho.slice(
      iChirho,
      iChirho + BATCH_SIZE_CHIRHO
    );

    const promisesChirho = batchChirho.map(
      async (senseRowChirho: any) => {
        try {
          const senseIdChirho = senseRowChirho.sense_id_chirho;
          const lemmaIdChirho = senseRowChirho.lemma_id_chirho;

          // Get lemma info
          const lemmaChirho: any = dbChirho
            .query(
              "SELECT gloss_chirho, pos_chirho FROM lemma_chirho WHERE id_chirho = ?1"
            )
            .get(lemmaIdChirho);

          // Get top-5 representative occurrences
          const occurrencesChirho: any[] = dbChirho
            .query(
              `SELECT sa.occurrence_id_chirho, w.surface_chirho, w.book_chirho, w.chapter_chirho, w.verse_chirho
               FROM sense_assignment_chirho sa
               JOIN word_chirho w ON sa.occurrence_id_chirho = w.id_chirho
               WHERE sa.sense_id_chirho = ?1
               ORDER BY sa.confidence_chirho DESC
               LIMIT 5`
            )
            .all(senseIdChirho);

          if (occurrencesChirho.length === 0) {
            return;
          }

          // Get glosses in diverse languages for each occurrence
          let contextChirho = "";
          for (const occChirho of occurrencesChirho) {
            contextChirho += `\nOccurrence ${occChirho.occurrence_id_chirho} (${occChirho.surface_chirho}, Book ${occChirho.book_chirho} Ch ${occChirho.chapter_chirho}:${occChirho.verse_chirho}):\n`;
            for (const langChirho of DIVERSE_LANGS_CHIRHO) {
              const glossChirho: any = dbChirho
                .query(
                  `SELECT gloss_text_chirho FROM gloss_import_chirho
                   WHERE word_id_chirho = ?1 AND language_code_chirho = ?2`
                )
                .get(occChirho.occurrence_id_chirho, langChirho);
              if (glossChirho) {
                contextChirho += `  ${langChirho}: ${glossChirho.gloss_text_chirho}\n`;
              }
            }
          }

          const promptChirho = `Given this Hebrew/Greek lemma "${lemmaIdChirho}" with POS "${lemmaChirho?.pos_chirho || "unknown"}" and base gloss "${lemmaChirho?.gloss_chirho || "unknown"}":

These occurrences all belong to the same word sense (cluster). Here are representative examples with glosses in 6 languages:
${contextChirho}

Please generate:
1. A concise sense label (2-5 words) describing this specific word sense
2. A one-sentence description of this sense

Respond in exactly this format:
LABEL: <your label>
DESCRIPTION: <your description>`;

          const responseChirho = await clientChirho.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 200,
            messages: [{ role: "user", content: promptChirho }],
          });

          const textChirho =
            responseChirho.content[0].type === "text"
              ? responseChirho.content[0].text
              : "";
          const labelMatchChirho = textChirho.match(/LABEL:\s*(.+)/);
          const descMatchChirho = textChirho.match(/DESCRIPTION:\s*(.+)/);

          if (labelMatchChirho) {
            updateStmtChirho.run(
              labelMatchChirho[1].trim(),
              descMatchChirho ? descMatchChirho[1].trim() : null,
              senseIdChirho
            );
            labeledChirho++;
          } else {
            failedChirho++;
          }
        } catch (errorChirho) {
          failedChirho++;
          console.error(
            `[label-senses-chirho] Error labeling sense ${senseRowChirho.sense_id_chirho}: ${errorChirho}`
          );
        }
      }
    );

    await Promise.all(promisesChirho);

    // Rate limiting
    await new Promise((resolveChirho) =>
      setTimeout(resolveChirho, RATE_LIMIT_DELAY_CHIRHO)
    );

    if ((iChirho + BATCH_SIZE_CHIRHO) % 100 === 0 || iChirho + BATCH_SIZE_CHIRHO >= unlabeledChirho.length) {
      console.log(
        `[label-senses-chirho] Progress: ${Math.min(iChirho + BATCH_SIZE_CHIRHO, unlabeledChirho.length)}/${unlabeledChirho.length} (${labeledChirho} labeled, ${failedChirho} failed)`
      );
    }
  }

  console.log("\n[label-senses-chirho] === RESULTS ===");
  console.log(`  Labeled:  ${labeledChirho}`);
  console.log(`  Failed:   ${failedChirho}`);

  // Show sample labels
  const samplesChirho: any[] = dbChirho
    .query(
      `SELECT sense_id_chirho, lemma_id_chirho, label_chirho, description_chirho
       FROM sense_chirho
       WHERE label_chirho IS NOT NULL
       ORDER BY RANDOM()
       LIMIT 10`
    )
    .all();

  if (samplesChirho.length > 0) {
    console.log("\n  Sample labels:");
    for (const sChirho of samplesChirho) {
      console.log(
        `    Sense ${sChirho.sense_id_chirho} (${sChirho.lemma_id_chirho}): "${sChirho.label_chirho}"`
      );
    }
  }

  dbChirho.close();
  console.log("\n[label-senses-chirho] Done.");
}

labelSensesChirho();
