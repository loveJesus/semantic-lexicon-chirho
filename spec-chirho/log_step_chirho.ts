// For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. — John 3:16 (KJV)

import { Database } from "bun:sqlite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const filenameChirho = fileURLToPath(import.meta.url);
const directoryChirho = dirname(filenameChirho);
const databasePathChirho = join(directoryChirho, "progress-chirho.sqlite");

type ArgumentsChirho = {
  commandChirho: string;
  idChirho: number | null;
  agentCodeChirho: string;
  actionTakenChirho: string;
  resultOfActionChirho: string;
  overviewOfResultChirho: string;
};

function argumentValueChirho(nameChirho: string): string | null {
  const prefixChirho = `--${nameChirho}=`;
  const matchChirho = process.argv.find((argumentChirho) => argumentChirho.startsWith(prefixChirho));
  return matchChirho === undefined ? null : matchChirho.slice(prefixChirho.length);
}

function parseArgumentsChirho(): ArgumentsChirho {
  const idTextChirho = argumentValueChirho("id-chirho");
  return {
    commandChirho: process.argv[2] ?? "",
    idChirho: idTextChirho === null ? null : Number(idTextChirho),
    agentCodeChirho: argumentValueChirho("agent-code-chirho") ?? "semantic-gpt-chirho",
    actionTakenChirho: argumentValueChirho("action-taken-chirho") ?? "",
    resultOfActionChirho: argumentValueChirho("result-of-action-chirho") ?? "",
    overviewOfResultChirho: argumentValueChirho("overview-of-result-chirho") ?? "",
  };
}

function requireTextChirho(valueChirho: string, fieldChirho: string): string {
  if (valueChirho.trim().length === 0) {
    throw new Error(`${fieldChirho} is required`);
  }
  return valueChirho;
}

function openDatabaseChirho(): Database {
  const databaseChirho = new Database(databasePathChirho);
  databaseChirho.exec(`
    CREATE TABLE IF NOT EXISTS steps_taken_chirho (
      id_chirho INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_code_chirho TEXT NOT NULL,
      timestamp_start_chirho TEXT NOT NULL,
      timestamp_end_chirho TEXT,
      action_taken_chirho TEXT NOT NULL,
      result_of_action_chirho TEXT NOT NULL DEFAULT '',
      overview_of_result_chirho TEXT NOT NULL DEFAULT ''
    );
  `);
  return databaseChirho;
}

function startChirho(argumentsChirho: ArgumentsChirho): void {
  const databaseChirho = openDatabaseChirho();
  const insertChirho = databaseChirho.query(`
    INSERT INTO steps_taken_chirho (
      agent_code_chirho,
      timestamp_start_chirho,
      action_taken_chirho,
      result_of_action_chirho,
      overview_of_result_chirho
    )
    VALUES (?, ?, ?, ?, ?)
  `);
  insertChirho.run(
    requireTextChirho(argumentsChirho.agentCodeChirho, "agent-code-chirho"),
    new Date().toISOString(),
    requireTextChirho(argumentsChirho.actionTakenChirho, "action-taken-chirho"),
    argumentsChirho.resultOfActionChirho,
    argumentsChirho.overviewOfResultChirho,
  );
  const idRowChirho = databaseChirho
    .query<{ id_chirho: number }, []>("SELECT last_insert_rowid() AS id_chirho")
    .get();
  if (idRowChirho === null) {
    throw new Error("Could not read inserted progress row id");
  }
  console.log(String(idRowChirho.id_chirho));
  databaseChirho.close();
}

function finishChirho(argumentsChirho: ArgumentsChirho): void {
  if (argumentsChirho.idChirho === null || !Number.isInteger(argumentsChirho.idChirho)) {
    throw new Error("id-chirho is required for finish");
  }
  const databaseChirho = openDatabaseChirho();
  const updateChirho = databaseChirho.query(`
    UPDATE steps_taken_chirho
       SET timestamp_end_chirho = ?,
           result_of_action_chirho = ?,
           overview_of_result_chirho = ?
     WHERE id_chirho = ?
  `);
  const resultChirho = updateChirho.run(
    new Date().toISOString(),
    requireTextChirho(argumentsChirho.resultOfActionChirho, "result-of-action-chirho"),
    requireTextChirho(argumentsChirho.overviewOfResultChirho, "overview-of-result-chirho"),
    argumentsChirho.idChirho,
  );
  if (resultChirho.changes !== 1) {
    throw new Error(`No progress row updated for id ${argumentsChirho.idChirho}`);
  }
  console.log(`finished ${argumentsChirho.idChirho}`);
  databaseChirho.close();
}

const argumentsChirho = parseArgumentsChirho();
if (argumentsChirho.commandChirho === "start") {
  startChirho(argumentsChirho);
} else if (argumentsChirho.commandChirho === "finish") {
  finishChirho(argumentsChirho);
} else {
  throw new Error("Usage: bun spec-chirho/log_step_chirho.ts start|finish --...");
}
