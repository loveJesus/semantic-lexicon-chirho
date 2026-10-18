// For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life. — John 3:16 (KJV)

import { describe, expect, test } from "bun:test";
import { isCacheableLexiconResponseChirho } from "../src/hooks.server";

describe("isCacheableLexiconResponseChirho", () => {
  test("allows deterministic successful reads on the custom domain", () => {
    expect(isCacheableLexiconResponseChirho("lexicon-chirho.bible.systems", "/lemma-chirho/G3588", "GET", 200)).toBe(true);
  });

  test("preserves the random homepage and excludes unsafe variants", () => {
    expect(isCacheableLexiconResponseChirho("lexicon-chirho.bible.systems", "/", "GET", 200)).toBe(false);
    expect(isCacheableLexiconResponseChirho("lexicon-chirho.lovejesus.workers.dev", "/lemma-chirho/G3588", "GET", 200)).toBe(false);
    expect(isCacheableLexiconResponseChirho("lexicon-chirho.bible.systems", "/lemma-chirho/G3588", "POST", 200)).toBe(false);
    expect(isCacheableLexiconResponseChirho("lexicon-chirho.bible.systems", "/domain-chirho/not-found", "GET", 404)).toBe(false);
    expect(isCacheableLexiconResponseChirho("lexicon-chirho.bible.systems", "/lemma-chirho/G3588", "GET", 500)).toBe(false);
  });
});

