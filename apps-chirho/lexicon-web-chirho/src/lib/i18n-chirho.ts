// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

const TRANSLATIONS_CHIRHO: Record<string, Record<string, string>> = {
  eng: {
    siteTitle: "Biblical Lexicon",
    siteSubtitle: "Hebrew, Aramaic & Greek lexicon with multilingual glosses and semantic domains",
    home: "Home",
    bible: "Bible",
    search: "Search",
    domains: "Domains",
    methodology: "Methodology",
    about: "About",
    readTheBible: "Read the Bible",
    seeSemanticDomains: "See Semantic Domains",
    downloadPdfEng: "Download PDF (English)",
    downloadPdfSpa: "Download PDF (Spanish)",
    viewFullLexicon: "View Full Lexicon",
    lemmas: "Lemmas",
    senses: "Senses",
    glossRecords: "Gloss Records",
    references: "References",
    someRandomLemmas: "Some Random Lemmas",
    mostFrequentLemmas: "Most Frequent Lemmas",
    showLess: "Show less",
    readMore: "Read more",
    viewEntry: "View entry",
    sensesHeader: "Senses",
    relatedSenses: "Related Senses",
    bdbReference: "BDB / Lexicon Reference",
    viewFullBdb: "View full BDB entry...",
    showLessBdb: "Show less",
    readInBible: "Read in Bible",
    moreSensesBelow: "more sense(s) below",
    domain: "Domain",
    glosses: "Glosses",
    more: "more",
    inSenses: "in {count} sense{plural}",
    footerStats: "Biblical Lexicon &mdash; 14,884 lemmas &middot; 20,143 senses &middot; 448,269 words &middot; 43 languages",
  },
  spa: {
    siteTitle: "Léxico Bíblico",
    siteSubtitle: "Léxico hebreo, arameo y griego con glosas multilingües y dominios semánticos",
    home: "Inicio",
    bible: "Biblia",
    search: "Buscar",
    domains: "Dominios",
    methodology: "Metodología",
    about: "Acerca de",
    readTheBible: "Leer la Biblia",
    seeSemanticDomains: "Ver Dominios Semánticos",
    downloadPdfEng: "Descargar PDF (Inglés)",
    downloadPdfSpa: "Descargar PDF (Español)",
    viewFullLexicon: "Ver Léxico Completo",
    lemmas: "Lemas",
    senses: "Sentidos",
    glossRecords: "Registros de Glosas",
    references: "Referencias",
    someRandomLemmas: "Algunos Lemas Aleatorios",
    mostFrequentLemmas: "Lemas Más Frecuentes",
    showLess: "Ver menos",
    readMore: "Leer más",
    viewEntry: "Ver entrada",
    sensesHeader: "Sentidos",
    relatedSenses: "Sentidos Relacionados",
    bdbReference: "Referencia BDB / Léxico",
    viewFullBdb: "Ver entrada BDB completa...",
    showLessBdb: "Ver menos",
    readInBible: "Leer en la Biblia",
    moreSensesBelow: "sentido(s) más abajo",
    domain: "Dominio",
    glosses: "Glosas",
    more: "más",
    inSenses: "en {count} sentido{plural}",
    footerStats: "Léxico Bíblico &mdash; 14.884 lemas &middot; 20.143 sentidos &middot; 448.269 palabras &middot; 43 idiomas",
  },
};

export function tChirho(langChirho: string, keyChirho: string): string {
  const langDataChirho = TRANSLATIONS_CHIRHO[langChirho] || TRANSLATIONS_CHIRHO.eng;
  return langDataChirho[keyChirho] || TRANSLATIONS_CHIRHO.eng[keyChirho] || keyChirho;
}

export function langParamChirho(urlChirho: URL): string {
  const langChirho = urlChirho.searchParams.get("lang");
  return langChirho === "spa" ? "spa" : "eng";
}

export function appendLangChirho(hrefChirho: string, langChirho: string): string {
  if (langChirho === "eng") return hrefChirho;
  const separatorChirho = hrefChirho.includes("?") ? "&" : "?";
  return `${hrefChirho}${separatorChirho}lang=${langChirho}`;
}
