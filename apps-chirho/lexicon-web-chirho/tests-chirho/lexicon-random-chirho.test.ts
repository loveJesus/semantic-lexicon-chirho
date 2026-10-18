// For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. — John 3:16 (KJV)

import { describe, expect, test } from "bun:test";
import { sampleUniqueOrdinalsChirho } from "../src/lib/server/lexicon-random-chirho";

describe("sampleUniqueOrdinalsChirho", () => {
  test("returns a bounded unique sample without scanning the pool", () => {
    const ordinalsChirho = sampleUniqueOrdinalsChirho(20_000, 9, () => 0);
    expect(ordinalsChirho).toHaveLength(9);
    expect(new Set(ordinalsChirho).size).toBe(9);
    expect(ordinalsChirho.every((ordinalChirho) => ordinalChirho >= 1 && ordinalChirho <= 20_000)).toBe(true);
  });

  test("caps the request at the available pool size", () => {
    expect(sampleUniqueOrdinalsChirho(3, 9, () => 0.5).sort((leftChirho, rightChirho) => leftChirho - rightChirho)).toEqual([1, 2, 3]);
  });

  test("normalizes invalid and empty sizes", () => {
    expect(sampleUniqueOrdinalsChirho(0, 9)).toEqual([]);
    expect(sampleUniqueOrdinalsChirho(-4, 9)).toEqual([]);
    expect(sampleUniqueOrdinalsChirho(4, Number.NaN)).toEqual([]);
  });
});

