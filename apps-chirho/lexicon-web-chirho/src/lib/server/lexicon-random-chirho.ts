// For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. — John 3:16 (KJV)

export interface LexiconStatRowChirho {
  lemma_count_chirho: number;
  sense_count_chirho: number;
  gloss_count_chirho: number;
  reference_count_chirho: number;
  english_random_pool_count_chirho: number;
  spanish_random_pool_count_chirho: number;
}

type RandomSourceChirho = () => number;

// Workflow: spec-chirho/workflows-chirho/lexicon-read-request-chirho.md
export function sampleUniqueOrdinalsChirho(
  poolSizeChirho: number,
  requestedSizeChirho: number,
  randomSourceChirho: RandomSourceChirho = Math.random,
): number[] {
  const normalizedPoolSizeChirho = Math.max(0, Math.floor(poolSizeChirho));
  const normalizedRequestedSizeChirho = Math.max(0, Math.floor(requestedSizeChirho));
  const sampleSizeChirho = Math.min(normalizedPoolSizeChirho, normalizedRequestedSizeChirho);
  const selectedOrdinalsChirho = new Set<number>();

  for (
    let candidateChirho = normalizedPoolSizeChirho - sampleSizeChirho + 1;
    candidateChirho <= normalizedPoolSizeChirho;
    candidateChirho += 1
  ) {
    const rawRandomChirho = randomSourceChirho();
    const boundedRandomChirho = Number.isFinite(rawRandomChirho)
      ? Math.min(Math.max(rawRandomChirho, 0), 1 - Number.EPSILON)
      : 0;
    const pickedOrdinalChirho = Math.floor(boundedRandomChirho * candidateChirho) + 1;
    selectedOrdinalsChirho.add(
      selectedOrdinalsChirho.has(pickedOrdinalChirho)
        ? candidateChirho
        : pickedOrdinalChirho,
    );
  }

  return [...selectedOrdinalsChirho];
}

