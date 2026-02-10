// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { readFileSync, readdirSync, writeFileSync } from "fs";

const DIR_CHIRHO = "./output-chirho/refinement-chirho/detect-results-chirho";
const OUT_PATH_CHIRHO = "./output-chirho/refinement-chirho/all-split-proposals-chirho.json";

const filesChirho = readdirSync(DIR_CHIRHO).filter((fChirho) => fChirho.endsWith(".json")).sort();

const allProposalsChirho: any[] = [];
let emptyCountChirho = 0;

for (const fChirho of filesChirho) {
  const rawChirho = readFileSync(`${DIR_CHIRHO}/${fChirho}`, "utf-8").trim();
  if (!rawChirho) { emptyCountChirho++; continue; }
  try {
    const dataChirho = JSON.parse(rawChirho);
    if (Array.isArray(dataChirho) && dataChirho.length > 0) {
      allProposalsChirho.push(...dataChirho);
    } else {
      emptyCountChirho++;
    }
  } catch (errChirho) {
    console.error(`Parse error in ${fChirho}: ${errChirho}`);
  }
}

console.log(`Files processed: ${filesChirho.length}`);
console.log(`Files with proposals: ${filesChirho.length - emptyCountChirho}`);
console.log(`Files with no splits: ${emptyCountChirho}`);
console.log(`Total split proposals: ${allProposalsChirho.length}`);
console.log("");

const highChirho = allProposalsChirho.filter((pChirho) => pChirho.confidenceChirho === "high").length;
const mediumChirho = allProposalsChirho.filter((pChirho) => pChirho.confidenceChirho === "medium").length;
const lowChirho = allProposalsChirho.filter((pChirho) => pChirho.confidenceChirho === "low" || pChirho.confidenceChirho === "Low").length;
console.log(`High confidence: ${highChirho}`);
console.log(`Medium confidence: ${mediumChirho}`);
console.log(`Low confidence: ${lowChirho}`);
console.log("");

const seenChirho = new Set<number>();
const dedupedChirho: any[] = [];
for (const pChirho of allProposalsChirho) {
  const keyChirho = pChirho.senseIdChirho;
  if (seenChirho.has(keyChirho)) {
    console.log(`Duplicate: ${pChirho.lemmaIdChirho} sense ${pChirho.senseIdChirho}`);
  } else {
    seenChirho.add(keyChirho);
    dedupedChirho.push(pChirho);
  }
}
console.log(`After dedup: ${dedupedChirho.length} unique senses to split`);
console.log("");

dedupedChirho.sort((aChirho, bChirho) =>
  (aChirho.lemmaIdChirho || "").localeCompare(bChirho.lemmaIdChirho || ""),
);

for (const pChirho of dedupedChirho) {
  const numSplitsChirho = pChirho.splitProposalChirho?.length || 0;
  const labelChirho =
    pChirho.currentLabelChirho ||
    pChirho.splitProposalChirho?.[0]?.newLabelChirho ||
    "";
  console.log(
    `${(pChirho.confidenceChirho || "?").toUpperCase().padEnd(7)} ${(pChirho.lemmaIdChirho || "?").padEnd(9)} sense ${String(pChirho.senseIdChirho).padEnd(8)} -> ${numSplitsChirho} sub-senses  ${labelChirho.substring(0, 55)}`,
  );
}

writeFileSync(OUT_PATH_CHIRHO, JSON.stringify(dedupedChirho, null, 2));
console.log(`\nWritten to ${OUT_PATH_CHIRHO}`);
