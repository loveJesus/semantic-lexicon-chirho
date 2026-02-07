// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import { getDbChirho } from "$lib/server/db-chirho";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
  const dbChirho = getDbChirho();
  const bookChirho = url.searchParams.get("book") || "";
  const chapterChirho = url.searchParams.get("chapter") || "";

  const booksChirho = dbChirho
    .prepare(
      `SELECT DISTINCT book_chirho, COUNT(DISTINCT verse_id_chirho) as verse_count_chirho
       FROM word_chirho
       GROUP BY book_chirho
       ORDER BY book_chirho`
    )
    .all() as Record<string, any>[];

  let versesChirho: Record<string, any>[] = [];
  let chaptersChirho: Record<string, any>[] = [];

  if (bookChirho) {
    chaptersChirho = dbChirho
      .prepare(
        `SELECT DISTINCT chapter_chirho, COUNT(DISTINCT verse_id_chirho) as verse_count_chirho
         FROM word_chirho
         WHERE book_chirho = ?
         GROUP BY chapter_chirho
         ORDER BY chapter_chirho`
      )
      .all(bookChirho) as Record<string, any>[];

    if (chapterChirho) {
      versesChirho = dbChirho
        .prepare(
          `SELECT DISTINCT verse_id_chirho, verse_chirho,
                  GROUP_CONCAT(surface_chirho, ' ') as text_chirho
           FROM word_chirho
           WHERE book_chirho = ? AND chapter_chirho = ?
           GROUP BY verse_id_chirho
           ORDER BY verse_chirho`
        )
        .all(bookChirho, chapterChirho) as Record<string, any>[];
    }
  }

  return { booksChirho, chaptersChirho, versesChirho, bookChirho, chapterChirho };
};
