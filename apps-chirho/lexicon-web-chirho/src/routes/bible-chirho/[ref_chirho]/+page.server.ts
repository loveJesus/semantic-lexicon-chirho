// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

import type { PageServerLoad } from "./$types";
import { error } from "@sveltejs/kit";

const BOOK_ABBREVS_CHIRHO: Record<string, number> = {
  gen:1,exod:2,lev:3,num:4,deut:5,josh:6,judg:7,ruth:8,'1sam':9,'2sam':10,
  '1kgs':11,'2kgs':12,'1chr':13,'2chr':14,ezra:15,neh:16,esth:17,job:18,
  ps:19,prov:20,eccl:21,song:22,isa:23,jer:24,lam:25,ezek:26,dan:27,
  hos:28,joel:29,amos:30,obad:31,jonah:32,mic:33,nah:34,hab:35,zeph:36,
  hag:37,zech:38,mal:39,matt:40,mark:41,luke:42,john:43,acts:44,rom:45,
  '1cor':46,'2cor':47,gal:48,eph:49,phil:50,col:51,'1thess':52,'2thess':53,
  '1tim':54,'2tim':55,titus:56,phlm:57,heb:58,jas:59,'1pet':60,'2pet':61,
  '1john':62,'2john':63,'3john':64,jude:65,rev:66,
  // numeric aliases
  ...Object.fromEntries(Array.from({length:66},(_,i)=>[(i+1).toString(),i+1]))
};

const BOOK_NAMES_CHIRHO: Record<number, string> = {
  1:'Genesis',2:'Exodus',3:'Leviticus',4:'Numbers',5:'Deuteronomy',
  6:'Joshua',7:'Judges',8:'Ruth',9:'1 Samuel',10:'2 Samuel',
  11:'1 Kings',12:'2 Kings',13:'1 Chronicles',14:'2 Chronicles',
  15:'Ezra',16:'Nehemiah',17:'Esther',18:'Job',19:'Psalms',20:'Proverbs',
  21:'Ecclesiastes',22:'Song of Solomon',23:'Isaiah',24:'Jeremiah',
  25:'Lamentations',26:'Ezekiel',27:'Daniel',28:'Hosea',29:'Joel',
  30:'Amos',31:'Obadiah',32:'Jonah',33:'Micah',34:'Nahum',35:'Habakkuk',
  36:'Zephaniah',37:'Haggai',38:'Zechariah',39:'Malachi',
  40:'Matthew',41:'Mark',42:'Luke',43:'John',44:'Acts',45:'Romans',
  46:'1 Corinthians',47:'2 Corinthians',48:'Galatians',49:'Ephesians',
  50:'Philippians',51:'Colossians',52:'1 Thessalonians',53:'2 Thessalonians',
  54:'1 Timothy',55:'2 Timothy',56:'Titus',57:'Philemon',58:'Hebrews',
  59:'James',60:'1 Peter',61:'2 Peter',62:'1 John',63:'2 John',
  64:'3 John',65:'Jude',66:'Revelation'
};

export const load: PageServerLoad = async ({ platform, params }) => {
  const dbChirho = platform!.env.DB_CHIRHO;

  // Parse ref like "gen.1" or "john.3" or "1.1" (book.chapter)
  const partsChirho = params.ref_chirho.toLowerCase().split(".");
  if (partsChirho.length < 2) error(400, "Use format: book.chapter (e.g. gen.1 or john.3)");

  const bookKeyChirho = partsChirho[0];
  const chapterChirho = parseInt(partsChirho[1]);
  const bookNumChirho = BOOK_ABBREVS_CHIRHO[bookKeyChirho];

  if (!bookNumChirho) error(404, `Unknown book: ${bookKeyChirho}`);
  if (isNaN(chapterChirho) || chapterChirho < 1) error(400, "Invalid chapter number");

  const wordsChirho = await dbChirho
    .prepare(
      `SELECT w.id_chirho, w.verse_chirho, w.position_chirho, w.surface_chirho,
              w.lemma_id_chirho, w.grammar_chirho, w.sense_id_chirho,
              s.ordinal_chirho, s.label_chirho
       FROM word_chirho w
       LEFT JOIN sense_entry_chirho s ON w.sense_id_chirho = s.sense_id_chirho
       WHERE w.book_chirho = ?1 AND w.chapter_chirho = ?2
       ORDER BY w.verse_chirho, w.position_chirho`
    )
    .bind(bookNumChirho, chapterChirho)
    .all();

  if (wordsChirho.results.length === 0) {
    error(404, `No data for ${BOOK_NAMES_CHIRHO[bookNumChirho]} ${chapterChirho}`);
  }

  // Get max chapter for this book for navigation
  const maxChapterChirho = await dbChirho
    .prepare("SELECT MAX(chapter_chirho) as mc FROM word_chirho WHERE book_chirho = ?1")
    .bind(bookNumChirho)
    .first<{ mc: number }>();

  // Determine if Hebrew/Aramaic (RTL) or Greek (LTR)
  const isOtChirho = bookNumChirho <= 39;

  return {
    bookNumChirho: bookNumChirho,
    bookNameChirho: BOOK_NAMES_CHIRHO[bookNumChirho],
    chapterChirho,
    maxChapterChirho: maxChapterChirho?.mc || 1,
    isOtChirho,
    wordsChirho: wordsChirho.results,
    bookKeyChirho,
  };
};
