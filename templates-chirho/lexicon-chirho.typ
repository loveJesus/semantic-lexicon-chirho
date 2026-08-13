// For God so loved the world that he gave his only begotten Son,
// that whoever believes in him should not perish but have eternal life.

#let data-chirho = json("/output-chirho/exports-chirho/lexicon-data-chirho.json")

// --- Page setup ---
#set page(
  paper: "a4",
  margin: (top: 2cm, bottom: 2cm, left: 1.8cm, right: 1.8cm),
  columns: 2,
  header: context {
    let loc-chirho = here()
    let page-num-chirho = counter(page).at(loc-chirho).first()
    if page-num-chirho > 2 {
      set text(size: 7.5pt, style: "italic")
      let elems-chirho = query(selector(<lemma-marker-chirho>).before(loc-chirho))
      if elems-chirho.len() > 0 {
        let last-elem-chirho = elems-chirho.last()
        let meta-chirho = last-elem-chirho.value
        align(center)[#meta-chirho]
      }
    }
  },
  footer: context {
    let page-num-chirho = counter(page).at(here()).first()
    if page-num-chirho > 2 {
      set text(size: 7.5pt)
      align(center)[#page-num-chirho]
    }
  },
)

#set text(
  font: ("New Computer Modern", "Ezra SIL", "Gentium Plus", "Noto Sans KR", "Noto Sans Syriac"),
  size: 8.5pt,
  lang: "en",
  fallback: true,
)
#set par(justify: true, leading: 0.5em)

// --- Title page ---
#page(columns: 1, header: none, footer: none)[
  #v(6cm)
  #align(center)[
    #text(size: 28pt, weight: "bold")[Biblical Semantic Lexicon]
    #v(0.8cm)
    #text(size: 14pt, fill: rgb("#555"))[
      Hebrew, Aramaic & Greek
    ]
    #v(0.5cm)
    #text(size: 11pt, fill: rgb("#777"))[
      #data-chirho.len() Lemmas #sym.dot.c 20,143 Senses #sym.dot.c 43 Languages
    ]
    #v(2cm)
    #text(size: 10pt, style: "italic", fill: rgb("#666"))[
      "For God so loved the world that he gave his only begotten Son, \
      that whoever believes in him should not perish but have eternal life." \
      #sym.dash.em John 3:16
    ]
    #v(3cm)
    #text(size: 9pt, fill: rgb("#888"))[
      Preliminary Draft #sym.dash.em #datetime.today().display("[month repr:long] [day], [year]")
    ]
  ]
]

// --- Blank page ---
#pagebreak()

// Separate Hebrew/Aramaic and Greek lemmas
#let heb-lemmas-chirho = data-chirho.filter(l-chirho => l-chirho.languageChirho == "heb")
#let grc-lemmas-chirho = data-chirho.filter(l-chirho => l-chirho.languageChirho == "grc")

// --- Helper to render a single sense ---
#let render-sense-chirho(s-chirho, show-number-chirho, total-senses-chirho) = {
  // Sense number + label
  if total-senses-chirho > 1 {
    text(weight: "bold", size: 8.5pt)[#s-chirho.ordinalChirho.]
    [ ]
  }
  if s-chirho.labelChirho != "" {
    text(weight: "bold")[#s-chirho.labelChirho]
    [ ]
  }

  // Occurrence count
  if s-chirho.occurrenceCountChirho > 0 {
    text(size: 7pt, fill: rgb("#666"))[\(#s-chirho.occurrenceCountChirho#sym.times\)]
    [ ]
  }

  // Description or enriched text
  if s-chirho.enrichedChirho != "" {
    text(size: 8pt)[#s-chirho.enrichedChirho]
  } else if s-chirho.descriptionChirho != "" {
    text(size: 8pt)[#s-chirho.descriptionChirho]
  }

  // Domain tag
  if s-chirho.domainChirho != "" {
    [ ]
    text(size: 6.5pt, fill: rgb("#8B4513"), weight: "bold")[#upper(s-chirho.domainChirho)]
  }

  // Multilingual glosses (eng, spa, fra, deu)
  let gloss-parts-chirho = ()
  for lang-chirho in ("eng", "spa", "fra", "deu") {
    if lang-chirho in s-chirho.glossesChirho {
      let items-chirho = s-chirho.glossesChirho.at(lang-chirho)
      if items-chirho.len() > 0 {
        let lang-label-chirho = if lang-chirho == "eng" { "en" } else if lang-chirho == "spa" { "es" } else if lang-chirho == "fra" { "fr" } else { "de" }
        gloss-parts-chirho.push(text(size: 7pt)[#text(weight: "bold")[#lang-label-chirho:] #items-chirho.join(", ")])
      }
    }
  }
  if gloss-parts-chirho.len() > 0 {
    linebreak()
    text(size: 7pt, fill: rgb("#444"))[#gloss-parts-chirho.join([ #sym.bar.v ])]
  }

  // References
  if s-chirho.referencesChirho.len() > 0 {
    [ ]
    text(size: 6.5pt, fill: rgb("#336"))[#s-chirho.referencesChirho.join("; ")]
  }

  // Small space after sense
  v(0.3em)
}

// --- Helper to render a lemma entry ---
#let render-lemma-chirho(l-chirho) = {
  // Place metadata marker for running headers
  [#metadata(l-chirho.lemmaIdChirho) <lemma-marker-chirho>]

  // Headword line: original script + lemma ID + POS + occurrence count
  {
    if l-chirho.headwordChirho != "" {
      if l-chirho.languageChirho == "heb" {
        text(font: "Ezra SIL", weight: "bold", size: 12pt, dir: rtl)[#l-chirho.headwordChirho]
      } else {
        text(font: "Gentium Plus", weight: "bold", size: 11pt)[#l-chirho.headwordChirho]
      }
      [ ]
    }
    text(size: 8pt, fill: rgb("#555"))[#l-chirho.lemmaIdChirho]
    [ ]
    if l-chirho.posChirho != "" {
      text(size: 7pt, style: "italic", fill: rgb("#555"))[#l-chirho.posChirho]
      [ ]
    }
    if l-chirho.occurrenceCountChirho > 0 {
      text(size: 7pt, fill: rgb("#888"))[\(#l-chirho.occurrenceCountChirho#sym.times\)]
    }
  }

  // Terse gloss in italics
  if l-chirho.glossTerseChirho != "" {
    linebreak()
    text(style: "italic", size: 8.5pt)[#l-chirho.glossTerseChirho]
  } else if l-chirho.glossCleanChirho != "" {
    // Fallback to cleaned raw gloss (truncated)
    let cps-chirho = l-chirho.glossCleanChirho.codepoints()
    let short-chirho = if cps-chirho.len() > 120 {
      cps-chirho.slice(0, 120).join() + "..."
    } else {
      l-chirho.glossCleanChirho
    }
    linebreak()
    text(style: "italic", size: 8pt)[#short-chirho]
  }

  // Readable gloss paragraph
  if l-chirho.glossReadableChirho != "" {
    linebreak()
    text(size: 8pt)[#l-chirho.glossReadableChirho]
  }

  // Senses
  if l-chirho.sensesChirho.len() > 0 {
    v(0.2em)
    for s-chirho in l-chirho.sensesChirho {
      render-sense-chirho(s-chirho, true, l-chirho.sensesChirho.len())
    }
  }

  // Entry separator
  v(0.4em)
  line(length: 100%, stroke: 0.3pt + rgb("#ccc"))
  v(0.3em)
}

// --- HEBREW / ARAMAIC SECTION ---
#align(center)[
  #text(size: 16pt, weight: "bold")[Hebrew & Aramaic]
  #v(0.2em)
  #text(size: 9pt, fill: rgb("#666"))[#heb-lemmas-chirho.len() entries]
]
#v(0.5em)

#for l-chirho in heb-lemmas-chirho {
  render-lemma-chirho(l-chirho)
}

// --- Section divider ---
#colbreak()
#pagebreak()

// --- GREEK SECTION ---
#align(center)[
  #text(size: 16pt, weight: "bold")[Greek]
  #v(0.2em)
  #text(size: 9pt, fill: rgb("#666"))[#grc-lemmas-chirho.len() entries]
]
#v(0.5em)

#for l-chirho in grc-lemmas-chirho {
  render-lemma-chirho(l-chirho)
}
