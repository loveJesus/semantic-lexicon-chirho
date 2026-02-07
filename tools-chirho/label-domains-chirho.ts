// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import Anthropic from "@anthropic-ai/sdk";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";
const ANTHROPIC_API_KEY_CHIRHO =
  process.env.ANTHROPIC_API_KEY_CHIRHO || process.env.ANTHROPIC_API_KEY || "";
const BATCH_SIZE_CHIRHO = 10;
const RATE_LIMIT_DELAY_CHIRHO = 1200;

async function labelDomainsChirho(): Promise<void> {
  const dbChirho = new Database(SQLITE_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");
  dbChirho.run("PRAGMA synchronous=NORMAL");

  // Get domains without descriptions (fine domains, level 1)
  const unlabeledChirho: any[] = dbChirho
    .query(
      `SELECT domain_id_chirho, name_chirho, parent_id_chirho
       FROM domain_chirho
       WHERE level_chirho = 1 AND description_chirho LIKE 'Auto-detected%'
       ORDER BY domain_id_chirho`
    )
    .all();

  console.log(
    `[label-domains-chirho] Found ${unlabeledChirho.length} domains to label`
  );

  if (unlabeledChirho.length === 0) {
    console.log("[label-domains-chirho] Nothing to label. Done.");
    dbChirho.close();
    return;
  }

  if (!ANTHROPIC_API_KEY_CHIRHO) {
    console.error(
      "[label-domains-chirho] No ANTHROPIC_API_KEY found. Skipping LLM labeling."
    );
    dbChirho.close();
    return;
  }

  const clientChirho = new Anthropic({ apiKey: ANTHROPIC_API_KEY_CHIRHO });

  const updateStmtChirho = dbChirho.prepare(
    `UPDATE domain_chirho
     SET name_chirho = ?1,
         description_chirho = ?2,
         elicitation_chirho = ?3
     WHERE domain_id_chirho = ?4`
  );

  let labeledChirho = 0;
  let failedChirho = 0;

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
      async (domainRowChirho: any) => {
        try {
          const domainIdChirho = domainRowChirho.domain_id_chirho;

          // Get top-10 member senses by fit_score
          const sensesChirho: any[] = dbChirho
            .query(
              `SELECT s.sense_id_chirho, s.lemma_id_chirho, s.label_chirho,
                      l.gloss_chirho, l.pos_chirho
               FROM domain_assignment_chirho da
               JOIN sense_chirho s ON da.sense_id_chirho = s.sense_id_chirho
               JOIN lemma_chirho l ON s.lemma_id_chirho = l.id_chirho
               WHERE da.domain_id_chirho = ?1
               ORDER BY da.fit_score_chirho DESC
               LIMIT 10`
            )
            .all(domainIdChirho);

          if (sensesChirho.length < 2) {
            return;
          }

          // Get representative glosses for each sense
          let contextChirho = "";
          for (const sChirho of sensesChirho) {
            const glossesChirho: any[] = dbChirho
              .query(
                `SELECT gi.language_code_chirho, gi.gloss_text_chirho
                 FROM sense_assignment_chirho sa
                 JOIN gloss_import_chirho gi ON sa.occurrence_id_chirho = gi.word_id_chirho
                 WHERE sa.sense_id_chirho = ?1
                 AND gi.language_code_chirho IN ('eng', 'spa', 'fra', 'deu')
                 LIMIT 4`
              )
              .all(sChirho.sense_id_chirho);

            contextChirho += `\n  Sense: ${sChirho.label_chirho || sChirho.lemma_id_chirho} (${sChirho.gloss_chirho || "?"}, ${sChirho.pos_chirho || "?"}): `;
            contextChirho += glossesChirho
              .map(
                (gChirho: any) =>
                  `${gChirho.language_code_chirho}="${gChirho.gloss_text_chirho}"`
              )
              .join(", ");
          }

          // Get parent supersense name
          const parentChirho: any = dbChirho
            .query(
              "SELECT name_chirho FROM domain_chirho WHERE domain_id_chirho = ?1"
            )
            .get(domainRowChirho.parent_id_chirho);

          const promptChirho = `These word senses from Hebrew/Greek Bible text have been grouped together into a semantic domain. The parent supersense is "${parentChirho?.name_chirho || "UNKNOWN"}".

Member senses:${contextChirho}

Please generate:
1. A concise domain name (2-4 words) describing this semantic cluster
2. A one-sentence description
3. An elicitation question (what question would a translator ask to identify words in this domain?)

Respond in exactly this format:
NAME: <domain name>
DESCRIPTION: <description>
QUESTION: <elicitation question>`;

          const responseChirho = await clientChirho.messages.create({
            model: "claude-sonnet-4-5-20250929",
            max_tokens: 300,
            messages: [{ role: "user", content: promptChirho }],
          });

          const textChirho =
            responseChirho.content[0].type === "text"
              ? responseChirho.content[0].text
              : "";
          const nameMatchChirho = textChirho.match(/NAME:\s*(.+)/);
          const descMatchChirho = textChirho.match(/DESCRIPTION:\s*(.+)/);
          const questMatchChirho = textChirho.match(/QUESTION:\s*(.+)/);

          if (nameMatchChirho) {
            updateStmtChirho.run(
              nameMatchChirho[1].trim(),
              descMatchChirho ? descMatchChirho[1].trim() : null,
              questMatchChirho ? questMatchChirho[1].trim() : null,
              domainIdChirho
            );
            labeledChirho++;
          } else {
            failedChirho++;
          }
        } catch (errorChirho) {
          failedChirho++;
          console.error(
            `[label-domains-chirho] Error: ${errorChirho}`
          );
        }
      }
    );

    await Promise.all(promisesChirho);
    await new Promise((resolveChirho) =>
      setTimeout(resolveChirho, RATE_LIMIT_DELAY_CHIRHO)
    );

    if (
      (iChirho + BATCH_SIZE_CHIRHO) % 50 === 0 ||
      iChirho + BATCH_SIZE_CHIRHO >= unlabeledChirho.length
    ) {
      console.log(
        `[label-domains-chirho] Progress: ${Math.min(iChirho + BATCH_SIZE_CHIRHO, unlabeledChirho.length)}/${unlabeledChirho.length}`
      );
    }
  }

  console.log("\n[label-domains-chirho] === RESULTS ===");
  console.log(`  Labeled:  ${labeledChirho}`);
  console.log(`  Failed:   ${failedChirho}`);

  dbChirho.close();
  console.log("[label-domains-chirho] Done.");
}

labelDomainsChirho();
