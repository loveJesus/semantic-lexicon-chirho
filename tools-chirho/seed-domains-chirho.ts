// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { Database } from "bun:sqlite";

const SQLITE_PATH_CHIRHO =
  process.env.SQLITE_PATH_CHIRHO || "./data-chirho/semantic-chirho.db";

interface SupersenseChirho {
  nameChirho: string;
  descriptionChirho: string;
  elicitationChirho: string;
}

const SUPERSENSES_CHIRHO: SupersenseChirho[] = [
  {
    nameChirho: "PERSON",
    descriptionChirho:
      "People, kinship, social roles, human identity and relationships",
    elicitationChirho: "What words describe types of people or human roles?",
  },
  {
    nameChirho: "BODY",
    descriptionChirho:
      "Body parts, physical states, health, bodily functions",
    elicitationChirho:
      "What words refer to parts of the body or physical conditions?",
  },
  {
    nameChirho: "LOCATION",
    descriptionChirho:
      "Places, geographical features, spatial relations, directions",
    elicitationChirho: "What words describe places or spatial relationships?",
  },
  {
    nameChirho: "ARTIFACT",
    descriptionChirho:
      "Man-made objects, tools, buildings, vessels, materials",
    elicitationChirho:
      "What words refer to things people make or use as tools?",
  },
  {
    nameChirho: "FOOD_DRINK",
    descriptionChirho:
      "Food, drink, cooking, eating, agricultural produce for consumption",
    elicitationChirho: "What words are related to food, drink, or eating?",
  },
  {
    nameChirho: "ANIMAL",
    descriptionChirho:
      "Animals, livestock, wild creatures, insects, animal products",
    elicitationChirho: "What words refer to animals or animal-related things?",
  },
  {
    nameChirho: "PLANT",
    descriptionChirho:
      "Plants, trees, agriculture, vegetation, botanical terms",
    elicitationChirho: "What words refer to plants, trees, or growing things?",
  },
  {
    nameChirho: "NATURAL_WORLD",
    descriptionChirho:
      "Weather, celestial bodies, elements, natural phenomena, seasons",
    elicitationChirho:
      "What words describe natural phenomena like weather, sky, or earth?",
  },
  {
    nameChirho: "TIME",
    descriptionChirho:
      "Time periods, seasons, ages, temporal references, duration",
    elicitationChirho:
      "What words refer to time, seasons, or when things happen?",
  },
  {
    nameChirho: "EVENT",
    descriptionChirho:
      "Events, happenings, occurrences, festivals, ceremonies",
    elicitationChirho:
      "What words describe events, ceremonies, or things that happen?",
  },
  {
    nameChirho: "ACTION",
    descriptionChirho:
      "Physical actions, motion, work, making, breaking, giving",
    elicitationChirho:
      "What words describe physical actions people do with their bodies?",
  },
  {
    nameChirho: "SPEECH",
    descriptionChirho:
      "Speaking, communication, language, writing, messages, oaths",
    elicitationChirho:
      "What words are related to speaking, writing, or communicating?",
  },
  {
    nameChirho: "COGNITION",
    descriptionChirho:
      "Thinking, knowing, learning, understanding, wisdom, memory",
    elicitationChirho:
      "What words describe mental activities like thinking or knowing?",
  },
  {
    nameChirho: "EMOTION",
    descriptionChirho:
      "Feelings, emotions, desires, attitudes, psychological states",
    elicitationChirho:
      "What words describe emotions or feelings people experience?",
  },
  {
    nameChirho: "MORAL",
    descriptionChirho:
      "Righteousness, sin, purity, guilt, ethical concepts, virtue/vice",
    elicitationChirho:
      "What words describe moral qualities — good, evil, right, wrong?",
  },
  {
    nameChirho: "SOCIAL",
    descriptionChirho:
      "Social interactions, community, customs, law, justice, trade",
    elicitationChirho:
      "What words describe social relationships, laws, or community life?",
  },
  {
    nameChirho: "AUTHORITY",
    descriptionChirho:
      "Power, rulership, government, military, servitude, command",
    elicitationChirho:
      "What words relate to authority, ruling, or power structures?",
  },
  {
    nameChirho: "WORSHIP",
    descriptionChirho:
      "Worship, sacrifice, prayer, temple, priesthood, religious practice",
    elicitationChirho:
      "What words are related to worship, sacrifice, or religious practice?",
  },
  {
    nameChirho: "SUPERNATURAL",
    descriptionChirho:
      "God, divine beings, angels, demons, spiritual reality, prophecy",
    elicitationChirho:
      "What words refer to God, spiritual beings, or supernatural things?",
  },
  {
    nameChirho: "QUANTITY",
    descriptionChirho:
      "Numbers, measurement, size, weight, distance, abundance/lack",
    elicitationChirho:
      "What words describe amounts, sizes, or measurements?",
  },
];

function seedDomainsChirho(): void {
  const dbChirho = new Database(SQLITE_PATH_CHIRHO);
  dbChirho.run("PRAGMA journal_mode=WAL");
  dbChirho.run("PRAGMA synchronous=NORMAL");

  // Clear existing domains if re-running
  dbChirho.run("DELETE FROM domain_ancestor_chirho");
  dbChirho.run("DELETE FROM domain_assignment_chirho");
  dbChirho.run("DELETE FROM domain_chirho");

  console.log("[seed-domains-chirho] Inserting supersense domains...");

  const insertChirho = dbChirho.prepare(
    `INSERT INTO domain_chirho (name_chirho, level_chirho, description_chirho, elicitation_chirho)
     VALUES (?1, 0, ?2, ?3)`
  );

  dbChirho.run("BEGIN");
  for (const ssChirho of SUPERSENSES_CHIRHO) {
    insertChirho.run(
      ssChirho.nameChirho,
      ssChirho.descriptionChirho,
      ssChirho.elicitationChirho
    );
  }

  // Compute self-referencing transitive closure for supersenses (each is its own ancestor at depth 0)
  const domainsChirho: any[] = dbChirho
    .query("SELECT domain_id_chirho FROM domain_chirho")
    .all();

  const insertAncestorChirho = dbChirho.prepare(
    `INSERT INTO domain_ancestor_chirho (domain_id_chirho, ancestor_id_chirho, depth_chirho)
     VALUES (?1, ?2, 0)`
  );

  for (const dChirho of domainsChirho) {
    insertAncestorChirho.run(
      dChirho.domain_id_chirho,
      dChirho.domain_id_chirho
    );
  }

  dbChirho.run("COMMIT");

  const countChirho: any = dbChirho
    .query("SELECT COUNT(*) as cnt_chirho FROM domain_chirho")
    .get();
  console.log(`\n[seed-domains-chirho] === RESULTS ===`);
  console.log(`  Supersenses created: ${countChirho.cnt_chirho}`);
  console.log(`  Level: 0 (supersense)`);
  console.log(
    `  Domains: ${SUPERSENSES_CHIRHO.map((sChirho) => sChirho.nameChirho).join(", ")}`
  );

  dbChirho.close();
  console.log("[seed-domains-chirho] Done.");
}

seedDomainsChirho();
