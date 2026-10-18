// For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. — John 3:16 (KJV)

import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import {
  communityDomainIndexQueryChirho,
  domainLemmaListingQueryChirho,
  domainResolutionQueryChirho,
  louwNidaChildrenQueryChirho,
  louwNidaDomainIndexQueryChirho,
  macroChildrenQueryChirho,
  macroDomainIndexQueryChirho,
} from "../src/lib/server/lexicon-domain-chirho";

let databaseChirho: Database;

const oldMacroIndexQueryChirho = `
  SELECT macro32_chirho AS name_chirho, COUNT(*) AS sense_count_chirho
  FROM sense_entry_chirho
  WHERE macro32_chirho IS NOT NULL
  GROUP BY macro32_chirho
  ORDER BY sense_count_chirho DESC, name_chirho DESC
`;

const oldLouwNidaIndexQueryChirho = `
  SELECT ln_domain_chirho AS name_chirho,
         macro32_chirho AS parent_chirho,
         COUNT(*) AS sense_count_chirho
  FROM sense_entry_chirho
  WHERE ln_domain_chirho IS NOT NULL
  GROUP BY ln_domain_chirho, macro32_chirho
  ORDER BY sense_count_chirho DESC
`;

const oldCommunityIndexQueryChirho = `
  SELECT community_chirho AS name_chirho,
         ln_domain_chirho AS parent_chirho,
         COUNT(*) AS sense_count_chirho
  FROM sense_entry_chirho
  WHERE community_chirho IS NOT NULL
  GROUP BY community_chirho, ln_domain_chirho
  ORDER BY sense_count_chirho DESC
  LIMIT 200
`;

beforeEach(async () => {
  databaseChirho = new Database(":memory:");
  databaseChirho.exec(`
    CREATE TABLE lemma_entry_chirho (
      lemma_id_chirho TEXT PRIMARY KEY,
      gloss_clean_chirho TEXT,
      pos_chirho TEXT,
      sense_count_chirho INTEGER NOT NULL,
      occurrence_count_chirho INTEGER NOT NULL
    );
    CREATE TABLE sense_entry_chirho (
      sense_id_chirho INTEGER PRIMARY KEY,
      lemma_id_chirho TEXT NOT NULL,
      macro32_chirho TEXT,
      ln_domain_chirho TEXT,
      community_chirho TEXT
    );
    INSERT INTO lemma_entry_chirho VALUES
      ('G0001', 'alpha', 'noun', 2, 100),
      ('G0002', 'beta', 'verb', 2, 50),
      ('G0003', 'gamma', 'adjective', 2, 50);
    INSERT INTO sense_entry_chirho VALUES
      (1, 'G0001', 'Movement', 'Linear', 'Going'),
      (2, 'G0001', 'Movement', 'Linear', 'Going'),
      (3, 'G0002', 'Movement', 'Motion', 'Going'),
      (4, 'G0002', 'Action', 'Doing', 'Action'),
      (5, 'G0003', 'Action', 'Doing', 'Acting'),
      (6, 'G0003', 'Movement', 'Motion', 'Acting');
  `);
  const migrationSqlChirho = await Bun.file(
    new URL("../migrations-chirho/0002_materialize_domain_reads_chirho.sql", import.meta.url),
  ).text();
  databaseChirho.exec(migrationSqlChirho);
});

afterEach(() => {
  databaseChirho.close();
});

function rowsChirho(queryChirho: string, ...bindingsChirho: (string | number)[]): Record<string, unknown>[] {
  return databaseChirho.query(queryChirho).all(...bindingsChirho) as Record<string, unknown>[];
}

describe("lexicon domain read model", () => {
  test("preserves the domain-index rows and order", () => {
    expect(rowsChirho(macroDomainIndexQueryChirho)).toEqual(rowsChirho(oldMacroIndexQueryChirho));
    expect(rowsChirho(louwNidaDomainIndexQueryChirho)).toEqual(rowsChirho(oldLouwNidaIndexQueryChirho));
    expect(rowsChirho(communityDomainIndexQueryChirho)).toEqual(rowsChirho(oldCommunityIndexQueryChirho));
  });

  test("preserves child-domain rows and order", () => {
    for (const macroChirho of ["Action", "Movement"]) {
      const oldChildrenChirho = rowsChirho(
        `SELECT ln_domain_chirho AS name_chirho, COUNT(*) AS sense_count_chirho
         FROM sense_entry_chirho
         WHERE macro32_chirho = ?1 AND ln_domain_chirho IS NOT NULL
         GROUP BY ln_domain_chirho
         ORDER BY sense_count_chirho DESC`,
        macroChirho,
      );
      expect(rowsChirho(macroChildrenQueryChirho, macroChirho)).toEqual(oldChildrenChirho);
    }

    for (const louwNidaChirho of ["Doing", "Linear", "Motion"]) {
      const oldChildrenChirho = rowsChirho(
        `SELECT community_chirho AS name_chirho, COUNT(*) AS sense_count_chirho
         FROM sense_entry_chirho
         WHERE ln_domain_chirho = ?1 AND community_chirho IS NOT NULL
         GROUP BY community_chirho
         ORDER BY sense_count_chirho DESC, name_chirho DESC`,
        louwNidaChirho,
      );
      expect(rowsChirho(louwNidaChildrenQueryChirho, louwNidaChirho)).toEqual(oldChildrenChirho);
    }
  });

  test("preserves hierarchy precedence, totals, and ranked lemma rows", () => {
    const hierarchyCasesChirho = [
      { hierarchyChirho: "macro32", columnChirho: "macro32_chirho", nameChirho: "Action" },
      { hierarchyChirho: "louw_nida", columnChirho: "ln_domain_chirho", nameChirho: "Linear" },
      { hierarchyChirho: "community", columnChirho: "community_chirho", nameChirho: "Acting" },
    ] as const;

    for (const hierarchyCaseChirho of hierarchyCasesChirho) {
      const countChirho = databaseChirho
        .query(`SELECT COUNT(*) AS count_chirho FROM sense_entry_chirho WHERE ${hierarchyCaseChirho.columnChirho} = ?1`)
        .get(hierarchyCaseChirho.nameChirho) as { count_chirho: number };
      expect(rowsChirho(domainResolutionQueryChirho, hierarchyCaseChirho.nameChirho)).toEqual([
        {
          hierarchy_chirho: hierarchyCaseChirho.hierarchyChirho,
          sense_count_chirho: countChirho.count_chirho,
        },
      ]);

      const oldLemmasChirho = rowsChirho(
        `SELECT sense_chirho.lemma_id_chirho,
                lemma_chirho.gloss_clean_chirho,
                lemma_chirho.pos_chirho,
                lemma_chirho.occurrence_count_chirho,
                COUNT(*) AS sense_in_domain_chirho,
                lemma_chirho.sense_count_chirho
         FROM sense_entry_chirho sense_chirho
         JOIN lemma_entry_chirho lemma_chirho
           ON sense_chirho.lemma_id_chirho = lemma_chirho.lemma_id_chirho
         WHERE sense_chirho.${hierarchyCaseChirho.columnChirho} = ?1
         GROUP BY sense_chirho.lemma_id_chirho
         ORDER BY lemma_chirho.occurrence_count_chirho DESC,
                  sense_chirho.lemma_id_chirho
         LIMIT 200`,
        hierarchyCaseChirho.nameChirho,
      );
      expect(
        rowsChirho(
          domainLemmaListingQueryChirho,
          hierarchyCaseChirho.hierarchyChirho,
          hierarchyCaseChirho.nameChirho,
        ),
      ).toEqual(oldLemmasChirho);
    }

    expect(rowsChirho(domainResolutionQueryChirho, "missing")).toEqual([]);
  });

  test("creates bounded lookup indexes", () => {
    const indexesChirho = rowsChirho("SELECT name FROM sqlite_master WHERE type = 'index'").map(
      (rowChirho) => rowChirho.name,
    );
    expect(indexesChirho).toContain("idx_domain_summary_rank_chirho");
    expect(indexesChirho).toContain("idx_domain_summary_parent_chirho");
    expect(indexesChirho).toContain("idx_domain_summary_name_chirho");
    expect(indexesChirho).toContain("idx_domain_lemma_rank_chirho");
  });
});
