// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import { mkdirSync, existsSync, writeFileSync } from "fs";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";

interface IssueChirho {
  typeChirho: string;
  countChirho: number;
  examplesChirho: Array<{
    wordIdChirho: string;
    languageCodeChirho: string;
    glossTextChirho: string;
  }>;
}

function validateGlossesChirho(): void {
  const dbChirho = new Database(SQLITE_PATH_CHIRHO);
  const issuesChirho: IssueChirho[] = [];

  // 1. Empty or whitespace-only glosses
  console.log("[validate-glosses-chirho] Checking empty glosses...");
  const emptyChirho: any[] = dbChirho
    .query(
      `SELECT word_id_chirho, language_code_chirho, gloss_text_chirho
       FROM gloss_import_chirho
       WHERE TRIM(gloss_text_chirho) = '' OR gloss_text_chirho IS NULL
       LIMIT 5`
    )
    .all();
  const emptyCountChirho: any = dbChirho
    .query(
      `SELECT COUNT(*) as cnt_chirho FROM gloss_import_chirho WHERE TRIM(gloss_text_chirho) = ''`
    )
    .get();
  issuesChirho.push({
    typeChirho: "empty_gloss_chirho",
    countChirho: emptyCountChirho.cnt_chirho,
    examplesChirho: emptyChirho.map((rChirho: any) => ({
      wordIdChirho: rChirho.word_id_chirho,
      languageCodeChirho: rChirho.language_code_chirho,
      glossTextChirho: rChirho.gloss_text_chirho,
    })),
  });

  // 2. Very long glosses (>50 chars, likely sentences)
  console.log("[validate-glosses-chirho] Checking long glosses...");
  const longChirho: any[] = dbChirho
    .query(
      `SELECT word_id_chirho, language_code_chirho, gloss_text_chirho
       FROM gloss_import_chirho
       WHERE LENGTH(gloss_text_chirho) > 50
       LIMIT 5`
    )
    .all();
  const longCountChirho: any = dbChirho
    .query(
      `SELECT COUNT(*) as cnt_chirho FROM gloss_import_chirho WHERE LENGTH(gloss_text_chirho) > 50`
    )
    .get();
  issuesChirho.push({
    typeChirho: "long_gloss_chirho",
    countChirho: longCountChirho.cnt_chirho,
    examplesChirho: longChirho.map((rChirho: any) => ({
      wordIdChirho: rChirho.word_id_chirho,
      languageCodeChirho: rChirho.language_code_chirho,
      glossTextChirho: rChirho.gloss_text_chirho,
    })),
  });

  // 3. Glosses with remaining non-ASCII dashes (should be 0 after materialization)
  console.log("[validate-glosses-chirho] Checking non-normalized dashes...");
  const dashCountChirho: any = dbChirho
    .query(
      `SELECT COUNT(*) as cnt_chirho FROM gloss_import_chirho
       WHERE gloss_text_chirho LIKE '%–%' OR gloss_text_chirho LIKE '%—%'`
    )
    .get();
  issuesChirho.push({
    typeChirho: "non_normalized_dashes_chirho",
    countChirho: dashCountChirho.cnt_chirho,
    examplesChirho: [],
  });

  // 4. Coverage per language
  console.log("[validate-glosses-chirho] Computing coverage per language...");
  const totalWordsChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM word_chirho")
    .get();
  const coverageChirho: any[] = dbChirho
    .query(
      `SELECT language_code_chirho,
              COUNT(*) as gloss_count_chirho,
              ROUND(COUNT(*) * 100.0 / ?1, 1) as coverage_pct_chirho
       FROM gloss_import_chirho
       GROUP BY language_code_chirho
       ORDER BY gloss_count_chirho DESC`
    )
    .all(totalWordsChirho.cnt_chirho);

  // Summary
  const reportChirho = {
    timestampChirho: new Date().toISOString(),
    totalWordsChirho: totalWordsChirho.cnt_chirho,
    issuesChirho,
    coverageByLanguageChirho: coverageChirho.map((rChirho: any) => ({
      languageCodeChirho: rChirho.language_code_chirho,
      glossCountChirho: rChirho.gloss_count_chirho,
      coveragePctChirho: rChirho.coverage_pct_chirho,
    })),
  };

  const outDirChirho = "./output-chirho/reports-chirho";
  if (!existsSync(outDirChirho)) {
    mkdirSync(outDirChirho, { recursive: true });
  }
  writeFileSync(
    `${outDirChirho}/gloss-validation-chirho.json`,
    JSON.stringify(reportChirho, null, 2)
  );

  console.log("\n[validate-glosses-chirho] === REPORT ===");
  for (const issueChirho of issuesChirho) {
    console.log(
      `  ${issueChirho.typeChirho}: ${issueChirho.countChirho} occurrences`
    );
  }
  console.log(`\n  Coverage by language (top 10):`);
  for (const cChirho of coverageChirho.slice(0, 10)) {
    console.log(
      `    ${cChirho.language_code_chirho}: ${cChirho.gloss_count_chirho} (${cChirho.coverage_pct_chirho}%)`
    );
  }
  console.log(
    `\n  Full coverage languages: ${coverageChirho.filter((cChirho: any) => cChirho.coverage_pct_chirho > 90).length}`
  );
  console.log(
    `  Partial coverage languages: ${coverageChirho.filter((cChirho: any) => cChirho.coverage_pct_chirho <= 90).length}`
  );
  console.log(
    `\n  Report saved to: ${outDirChirho}/gloss-validation-chirho.json`
  );

  dbChirho.close();
}

validateGlossesChirho();
