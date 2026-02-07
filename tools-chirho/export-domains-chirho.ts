// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";
import { mkdirSync, existsSync, writeFileSync } from "fs";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";

function exportDomainsChirho(): void {
  const dbChirho = new Database(SQLITE_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");

  const outDirChirho = "./output-chirho/exports-chirho";
  const csvDirChirho = `${outDirChirho}/csv-chirho`;
  if (!existsSync(outDirChirho)) mkdirSync(outDirChirho, { recursive: true });
  if (!existsSync(csvDirChirho)) mkdirSync(csvDirChirho, { recursive: true });

  console.log("[export-chirho] Exporting ontology...");

  // 1. JSON export
  const domainsChirho: any[] = dbChirho
    .query(
      `SELECT domain_id_chirho, parent_id_chirho, name_chirho, level_chirho,
              description_chirho, elicitation_chirho, created_at_chirho
       FROM domain_chirho ORDER BY level_chirho, domain_id_chirho`
    )
    .all();

  const sensesChirho: any[] = dbChirho
    .query(
      `SELECT s.sense_id_chirho, s.lemma_id_chirho, s.label_chirho,
              s.description_chirho, s.cluster_method_chirho,
              l.gloss_chirho as lemma_gloss_chirho, l.pos_chirho,
              COUNT(sa.occurrence_id_chirho) as occurrence_count_chirho
       FROM sense_chirho s
       LEFT JOIN lemma_chirho l ON s.lemma_id_chirho = l.id_chirho
       LEFT JOIN sense_assignment_chirho sa ON s.sense_id_chirho = sa.sense_id_chirho
       GROUP BY s.sense_id_chirho
       ORDER BY s.sense_id_chirho`
    )
    .all();

  const domainAssignmentsChirho: any[] = dbChirho
    .query(
      `SELECT sense_id_chirho, domain_id_chirho, fit_score_chirho, source_chirho
       FROM domain_assignment_chirho
       ORDER BY sense_id_chirho`
    )
    .all();

  const scorecardChirho: any = dbChirho
    .query(
      `SELECT * FROM (
         SELECT coverage_chirho, coherence_chirho, separation_chirho,
                cross_lang_score_chirho, violation_count_chirho
         FROM proposal_chirho
         ORDER BY proposal_id_chirho DESC
         LIMIT 1
       )`
    )
    .get();

  const jsonExportChirho = {
    headerChirho:
      "For God so loved the world that he gave his only begotten Son, that whoever believes in him should not perish but have eternal life.",
    exportedAtChirho: new Date().toISOString(),
    licenseChirho: "CC BY-SA 4.0",
    domainsChirho,
    sensesChirho,
    domainAssignmentsChirho,
    scorecardChirho,
  };

  writeFileSync(
    `${outDirChirho}/ontology-chirho.json`,
    JSON.stringify(jsonExportChirho, null, 2)
  );
  console.log(`  JSON: ${outDirChirho}/ontology-chirho.json`);

  // 2. SQL export
  let sqlChirho =
    "-- For God so loved the world that he gave his only begotten Son,\n-- that whoever believes in him should not perish but have eternal life.\n\n";
  sqlChirho += "-- Semantic Domain Ontology Export\n";
  sqlChirho += `-- Exported: ${new Date().toISOString()}\n`;
  sqlChirho += "-- License: CC BY-SA 4.0\n\n";

  for (const dChirho of domainsChirho) {
    const nameEscChirho = (dChirho.name_chirho || "").replace(/'/g, "''");
    const descEscChirho = (dChirho.description_chirho || "").replace(
      /'/g,
      "''"
    );
    sqlChirho += `INSERT INTO domain_chirho (domain_id_chirho, parent_id_chirho, name_chirho, level_chirho, description_chirho) VALUES (${dChirho.domain_id_chirho}, ${dChirho.parent_id_chirho || "NULL"}, '${nameEscChirho}', ${dChirho.level_chirho}, '${descEscChirho}');\n`;
  }

  for (const sChirho of sensesChirho) {
    const labelEscChirho = (sChirho.label_chirho || "").replace(/'/g, "''");
    sqlChirho += `INSERT INTO sense_chirho (sense_id_chirho, lemma_id_chirho, label_chirho) VALUES (${sChirho.sense_id_chirho}, '${sChirho.lemma_id_chirho}', '${labelEscChirho}');\n`;
  }

  writeFileSync(`${outDirChirho}/ontology-chirho.sql`, sqlChirho);
  console.log(`  SQL: ${outDirChirho}/ontology-chirho.sql`);

  // 3. CSV exports
  // Domains CSV
  let domainsCsvChirho =
    "domain_id_chirho,parent_id_chirho,name_chirho,level_chirho,description_chirho\n";
  for (const dChirho of domainsChirho) {
    domainsCsvChirho += `${dChirho.domain_id_chirho},${dChirho.parent_id_chirho || ""},${csvEscapeChirho(dChirho.name_chirho)},${dChirho.level_chirho},${csvEscapeChirho(dChirho.description_chirho)}\n`;
  }
  writeFileSync(`${csvDirChirho}/domains-chirho.csv`, domainsCsvChirho);

  // Senses CSV
  let sensesCsvChirho =
    "sense_id_chirho,lemma_id_chirho,label_chirho,lemma_gloss_chirho,pos_chirho,occurrence_count_chirho\n";
  for (const sChirho of sensesChirho) {
    sensesCsvChirho += `${sChirho.sense_id_chirho},${sChirho.lemma_id_chirho},${csvEscapeChirho(sChirho.label_chirho)},${csvEscapeChirho(sChirho.lemma_gloss_chirho)},${sChirho.pos_chirho || ""},${sChirho.occurrence_count_chirho}\n`;
  }
  writeFileSync(`${csvDirChirho}/senses-chirho.csv`, sensesCsvChirho);

  // Assignments CSV
  let assignmentsCsvChirho =
    "sense_id_chirho,domain_id_chirho,fit_score_chirho,source_chirho\n";
  for (const aChirho of domainAssignmentsChirho) {
    assignmentsCsvChirho += `${aChirho.sense_id_chirho},${aChirho.domain_id_chirho},${aChirho.fit_score_chirho},${aChirho.source_chirho}\n`;
  }
  writeFileSync(
    `${csvDirChirho}/assignments-chirho.csv`,
    assignmentsCsvChirho
  );

  console.log(`  CSV: ${csvDirChirho}/`);

  // Stats
  console.log("\n[export-chirho] === EXPORT STATS ===");
  console.log(`  Domains:       ${domainsChirho.length}`);
  console.log(`  Senses:        ${sensesChirho.length}`);
  console.log(`  Assignments:   ${domainAssignmentsChirho.length}`);

  dbChirho.close();
  console.log("[export-chirho] Done.");
}

function csvEscapeChirho(valChirho: string | null): string {
  if (!valChirho) return "";
  if (
    valChirho.includes(",") ||
    valChirho.includes('"') ||
    valChirho.includes("\n")
  ) {
    return `"${valChirho.replace(/"/g, '""')}"`;
  }
  return valChirho;
}

exportDomainsChirho();
