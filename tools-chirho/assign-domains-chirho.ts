// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";

function assignDomainsChirho(): void {
  const dbChirho = new Database(SQLITE_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");
  dbChirho.run("PRAGMA synchronous=NORMAL");

  // Get all senses
  const sensesChirho: any[] = dbChirho
    .query("SELECT sense_id_chirho, lemma_id_chirho FROM sense_chirho")
    .all();

  // Get all fine domains (level 1) with their parent supersense
  const fineDomainsChirho: any[] = dbChirho
    .query(
      `SELECT d.domain_id_chirho, d.name_chirho, d.parent_id_chirho,
              p.name_chirho as parent_name_chirho
       FROM domain_chirho d
       LEFT JOIN domain_chirho p ON d.parent_id_chirho = p.domain_id_chirho
       WHERE d.level_chirho = 1`
    )
    .all();

  // Get all supersense domains
  const supersensesChirho: any[] = dbChirho
    .query(
      "SELECT domain_id_chirho, name_chirho FROM domain_chirho WHERE level_chirho = 0"
    )
    .all();

  console.log(
    `[assign-domains-chirho] Assigning ${sensesChirho.length} senses to ${fineDomainsChirho.length} fine domains (${supersensesChirho.length} supersenses)`
  );

  if (fineDomainsChirho.length === 0) {
    // No fine domains — assign directly to supersenses using round-robin
    console.log(
      "[assign-domains-chirho] No fine domains found. Assigning to supersenses..."
    );

    dbChirho.run("DELETE FROM domain_assignment_chirho");
    dbChirho.run("BEGIN");

    const insertChirho = dbChirho.prepare(
      `INSERT INTO domain_assignment_chirho (sense_id_chirho, domain_id_chirho, fit_score_chirho, source_chirho)
       VALUES (?1, ?2, ?3, 'auto')`
    );

    // Simple heuristic: hash lemma_id to pick a supersense
    for (const senseChirho of sensesChirho) {
      let hashChirho = 0;
      for (
        let iChirho = 0;
        iChirho < senseChirho.lemma_id_chirho.length;
        iChirho++
      ) {
        hashChirho =
          (hashChirho * 31 + senseChirho.lemma_id_chirho.charCodeAt(iChirho)) %
          supersensesChirho.length;
      }
      // Add sense_id to vary within same lemma
      hashChirho =
        (hashChirho + senseChirho.sense_id_chirho) %
        supersensesChirho.length;

      const domainChirho = supersensesChirho[hashChirho];
      insertChirho.run(
        senseChirho.sense_id_chirho,
        domainChirho.domain_id_chirho,
        0.5
      );
    }

    dbChirho.run("COMMIT");
  } else {
    // Assign senses to fine domains using a simple modular hashing approach
    // (A real implementation would use feature vector similarity to domain centroids)
    dbChirho.run("DELETE FROM domain_assignment_chirho");
    dbChirho.run("BEGIN");

    const insertChirho = dbChirho.prepare(
      `INSERT INTO domain_assignment_chirho (sense_id_chirho, domain_id_chirho, fit_score_chirho, source_chirho)
       VALUES (?1, ?2, ?3, 'auto')`
    );

    // Also assign to parent supersense
    const insertParentChirho = dbChirho.prepare(
      `INSERT OR IGNORE INTO domain_assignment_chirho (sense_id_chirho, domain_id_chirho, fit_score_chirho, source_chirho)
       VALUES (?1, ?2, ?3, 'auto_hierarchy')`
    );

    for (const senseChirho of sensesChirho) {
      let hashChirho = 0;
      for (
        let iChirho = 0;
        iChirho < senseChirho.lemma_id_chirho.length;
        iChirho++
      ) {
        hashChirho =
          (hashChirho * 31 + senseChirho.lemma_id_chirho.charCodeAt(iChirho)) %
          fineDomainsChirho.length;
      }
      hashChirho =
        (hashChirho + senseChirho.sense_id_chirho) %
        fineDomainsChirho.length;

      const fineDomainChirho = fineDomainsChirho[hashChirho];
      insertChirho.run(
        senseChirho.sense_id_chirho,
        fineDomainChirho.domain_id_chirho,
        0.5
      );

      // Hierarchy closure: also assign to parent supersense
      if (fineDomainChirho.parent_id_chirho) {
        insertParentChirho.run(
          senseChirho.sense_id_chirho,
          fineDomainChirho.parent_id_chirho,
          0.3
        );
      }
    }

    dbChirho.run("COMMIT");
  }

  // Stats
  const assignCountChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM domain_assignment_chirho")
    .get();
  const multiLabelChirho: any = dbChirho
    .query(
      `SELECT COUNT(*) as cnt_chirho FROM (
         SELECT sense_id_chirho FROM domain_assignment_chirho
         GROUP BY sense_id_chirho
         HAVING COUNT(*) > 1
       )`
    )
    .get();
  const unassignedChirho: any = dbChirho
    .query(
      `SELECT COUNT(*) as cnt_chirho FROM sense_chirho
       WHERE sense_id_chirho NOT IN (SELECT sense_id_chirho FROM domain_assignment_chirho)`
    )
    .get();

  console.log("\n[assign-domains-chirho] === RESULTS ===");
  console.log(`  Total assignments:    ${assignCountChirho.cnt_chirho}`);
  console.log(`  Multi-label senses:   ${multiLabelChirho.cnt_chirho}`);
  console.log(`  Unassigned senses:    ${unassignedChirho.cnt_chirho}`);

  // Distribution across supersenses
  const distChirho: any[] = dbChirho
    .query(
      `SELECT d.name_chirho, COUNT(*) as cnt_chirho
       FROM domain_assignment_chirho da
       JOIN domain_chirho d ON da.domain_id_chirho = d.domain_id_chirho
       WHERE d.level_chirho = 0
       GROUP BY d.name_chirho
       ORDER BY cnt_chirho DESC`
    )
    .all();

  if (distChirho.length > 0) {
    console.log("\n  Distribution by supersense:");
    for (const dChirho of distChirho) {
      console.log(`    ${dChirho.name_chirho}: ${dChirho.cnt_chirho}`);
    }
  }

  dbChirho.close();
  console.log("\n[assign-domains-chirho] Done.");
}

assignDomainsChirho();
