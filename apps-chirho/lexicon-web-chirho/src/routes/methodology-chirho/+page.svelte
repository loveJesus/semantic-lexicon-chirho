<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->

<h1>Methodology</h1>

<div class="article-chirho">

<p><em>"Seek to make every semantic decision traceable to evidence, and make every proposal testable
with fast, repeatable queries."</em> &mdash; guiding principle from this project's design document</p>

<p>This page explains how the Biblical Lexicon was built: how the senses were decided, how
the glosses for lemmas and senses were composed, and how the semantic domains were assigned.
The entire pipeline was designed to be reproducible, evidence-backed, and free of dependency
on copyrighted lexical resources.</p>

<h2>1. Source Data: Multilingual Translation Signatures</h2>

<p>The foundation of this lexicon is a massive body of word-level glossed translations: <strong>448,269
original-language word tokens</strong> (Hebrew, Aramaic, and Greek) across the entire Protestant canon,
each with a <strong>1:1 gloss in up to 43 target languages</strong>.</p>

<p>These glosses were produced by <a href="https://bible.systems">Bible.Systems</a>, spurred by
the work begun at <a href="https://globalbibletools.com">GlobalBibleTools.com</a>. Bible.Systems
is a platform for computational tools related to the Bible, including a Bible translation platform,
where every Hebrew/Greek token has a corresponding translation unit in each target language.
For the purposes of this lexicon, this 1:1 alignment is unusual and extremely valuable&mdash;it
removes the alignment noise that plagues most multilingual NLP pipelines.</p>

<p>The key linguistic insight: <strong>translation divergence across language families is one of the
strongest signals of <a href="https://en.wikipedia.org/wiki/Polysemy">polysemy</a></strong>. When
the same Hebrew lemma maps to different glosses across unrelated languages (say Hindi, Mandarin,
and Swahili), that almost certainly indicates distinct senses. A word that is always translated the
same way across all 43 languages is very likely monosemous.</p>

<div class="info-box-chirho">
<strong>Languages used:</strong> South Asian (Hindi, Bengali, Urdu, Marathi, Telugu, Tamil, Gujarati,
Punjabi), East Asian (Mandarin, Cantonese, Japanese, Korean, Vietnamese, Thai, Burmese), Southeast
Asian (Indonesian, Javanese, Tagalog), European (Spanish, Portuguese, French, German, Italian,
Dutch, Polish, Ukrainian, Russian, Romanian, Czech, Hungarian, Greek, Swedish, Norwegian, Danish),
Middle Eastern (Arabic, Hebrew, Turkish, Persian), African (Swahili, Hausa, Yoruba, Amharic),
and Caribbean (Haitian Creole). Of these, 17 languages had full Bible coverage and were used
as primary clustering features.
</div>

<h2>2. Feature Materialization</h2>

<p>The raw glosses were decomposed into structured features for computational use. Each
gloss string was normalized (<a href="https://en.wikipedia.org/wiki/Unicode_equivalence#Normal_forms">Unicode NFKC</a>,
dash normalization) and then split three ways:</p>

<ul>
<li><strong>Phrase features</strong> &mdash; the complete gloss string, e.g. <code>make-known</code>
(weight: 3.0)</li>
<li><strong>Head features</strong> &mdash; the last component word, e.g. <code>known</code>
(weight: 2.0)</li>
<li><strong>Part features</strong> &mdash; each component individually, e.g. <code>make</code> and
<code>known</code> (weight: 1.0)</li>
</ul>

<p>All tokens were dictionary-encoded to integers for fast computation. This materialization
produced <strong>7.5 million phrase features</strong>, <strong>11 million part features</strong>,
and <strong>7.5 million head features</strong>&mdash;the raw material for sense induction.</p>

<p>The materialization was performed by a custom Rust binary (<code>materialize-chirho</code>)
that processes the full 7.6M gloss rows in about 8 minutes on an Apple M4.</p>

<h2>3. Sense Induction: Agglomerative Clustering</h2>

<p>For each of the 14,639 lemmas, all occurrences were clustered based on their multilingual
translation signatures. The algorithm:</p>

<ol>
<li>For each lemma, collect all token occurrences and their feature vectors across all
available languages.</li>
<li>Compute <strong>pairwise weighted <a href="https://en.wikipedia.org/wiki/Jaccard_index">Jaccard
similarity</a></strong> between occurrences. Occurrences that are translated similarly across many
languages land close together; occurrences that diverge in translation are pushed apart.</li>
<li>Run <strong><a href="https://en.wikipedia.org/wiki/Hierarchical_clustering">agglomerative
(hierarchical) clustering</a></strong> with a similarity threshold, cutting the
<a href="https://en.wikipedia.org/wiki/Dendrogram">dendrogram</a> where translation signatures
diverge.</li>
<li>Each resulting cluster becomes a candidate <strong>sense</strong>.</li>
</ol>

<p>This initial pass produced <strong>56,976 candidate senses</strong> from 14,639 lemmas.
Many lemmas were correctly identified as monosemous (one cluster). But the clustering was
deliberately conservative&mdash;it was better to over-split than to lump genuinely distinct
senses together, because merging is easier (and less destructive) than splitting.</p>

<h2>4. LLM Merge Review (Pass 1: 10+ Senses)</h2>

<p>The first merge pass focused on the most over-split lemmas: 1,919 lemmas that had
been assigned 10 or more candidate senses. Each lemma was reviewed by <strong>Opus 4.6</strong>,
Anthropic's most capable model at the time of this writing, which was given:</p>

<ul>
<li>All candidate sense clusters for the lemma</li>
<li>Representative occurrences in each cluster with glosses in 5&ndash;6 diverse languages</li>
<li>The <a href="https://en.wikipedia.org/wiki/Brown%E2%80%93Driver%E2%80%93Briggs">BDB</a>/<a href="https://en.wikipedia.org/wiki/A_Greek%E2%80%93English_Lexicon">LSJ</a> lexicon entry for reference</li>
<li>Instructions to merge clusters that represent the same lexical sense while preserving
genuinely distinct meanings</li>
</ul>

<p>The model produced structured merge decisions (which clusters to combine, which to keep
separate) with linguistic reasoning. This reduced the sense inventory from 56,976 down to
<strong>30,897 senses</strong>.</p>

<div class="info-box-chirho">
<strong>Quality gate:</strong> We tested both Opus 4.6 and Sonnet 4.5 on the same lemmas. Sonnet
tended to collapse senses too aggressively (e.g., merging H8130 down to 2 senses where Opus
correctly identified 6). Opus 4.6 was used exclusively for all merge decisions because building
a real lexicon requires distinguishing subtle semantic differences.
</div>

<h2>5. Automated Cross-Lingual Merge (2&ndash;9 Senses)</h2>

<p>For lemmas with 2&ndash;9 candidate senses (too many for manual review, too few for the LLM
batch pass), we ran an <strong>automated agglomerative merge</strong> using cross-lingual
<a href="https://en.wikipedia.org/wiki/Jaccard_index">Jaccard similarity</a> between sense
clusters:</p>

<ol>
<li>For each pair of senses within a lemma, compute the overlap of their multilingual gloss
distributions.</li>
<li>If two senses share more than a threshold proportion of their translations across
multiple languages, merge them.</li>
<li>Repeat until no more merges are possible.</li>
</ol>

<p>This brought the count down to <strong>26,523 senses</strong>.</p>

<h2>6. Opus Re-Merge (Full Re-Review)</h2>

<p>To catch remaining over-splits and ensure consistency, all 1,499 still-polysemous lemmas
were sent through a second full Opus review pass. This generated <strong>4,443 merge response
files</strong>, each containing structured decisions with reasoning.</p>

<p>After applying all merges, the final sense inventory settled at <strong>20,143 senses</strong>&mdash;a
64.6% reduction from the initial 56,976. The distribution:</p>

<ul>
<li><strong>12,261 monosemous lemmas</strong> (one sense)</li>
<li><strong>2,377 polysemous lemmas</strong> (average 3.3 senses each, maximum 20)</li>
</ul>

<h2>7. Sense Refinement: Split Proposals</h2>

<p>After the merge passes, we ran a detection pass to find senses that may have been
<strong>over-lumped</strong>&mdash;cases where a single sense cluster actually contained two or
more distinct meanings (e.g., a literal and metaphorical use). The refinement pipeline:</p>

<ol>
<li><strong>Detection:</strong> Scan all senses for high internal
<a href="https://en.wikipedia.org/wiki/Entropy_(information_theory)">translation entropy</a> or
bimodal gloss distributions, which suggest that distinct sub-senses were merged together.</li>
<li><strong>Proposal generation:</strong> For each flagged sense, generate a split proposal with
the evidence for separation.</li>
<li><strong>LLM reassignment:</strong> Opus 4.6 reviews each proposal and, where warranted,
assigns occurrences to new sub-senses with appropriate labels.</li>
</ol>

<p>This produced <strong>168 sub-senses</strong> from 82 split proposals, covering 38,032
occurrences that were reassigned to more precise sense distinctions.</p>

<h2>8. Semantic Domain Assignment</h2>

<p>Each of the 20,143 senses was classified into a three-level semantic domain hierarchy:</p>

<h3>8a. Macro Domains (32)</h3>
<p>Broad conceptual categories like <em>Communication</em>, <em>Emotion</em>,
<em>Movement</em>, <em>Kinship</em>, <em>Worship</em>, etc. These were seeded from a combination
of <a href="https://en.wikipedia.org/wiki/Louw%E2%80%93Nida_Lexicon">Louw &amp; Nida</a>&ndash;style
categories and <a href="https://semdom.org/">SIL's open semantic domain hierarchy</a> (CC BY-SA 4.0),
then refined based on the actual distribution of senses in the data.</p>

<h3>8b. Supersense Categories (93)</h3>
<p>Mid-level groupings under each macro domain, following the structure of <a href="https://en.wikipedia.org/wiki/Louw%E2%80%93Nida_Lexicon">Louw &amp; Nida's</a>
semantic classification but derived independently from our data.</p>

<h3>8c. Fine Clusters (1,236)</h3>
<p>These were produced by <strong><a href="https://en.wikipedia.org/wiki/Community_structure">community
detection</a></strong> (<a href="https://en.wikipedia.org/wiki/Louvain_method">Louvain algorithm</a>)
on a sense-to-sense similarity graph. Each community of semantically related senses becomes a
fine-grained domain cluster.</p>

<h3>Assignment Method</h3>
<p>Each sense was assigned to its nearest domain via <strong><a href="https://en.wikipedia.org/wiki/Centroid">centroid</a>
proximity</strong>: the translation signature of each sense was compared against the centroid
(average signature) of each domain, and the best-fitting domain was selected. Multi-label
assignment was allowed where a sense genuinely spans domain boundaries.</p>

<p>The result: <strong>39,658 domain assignments</strong> connecting senses to the 2,135-node
domain hierarchy.</p>

<h2>9. Gloss Composition</h2>

<p>For each lemma and sense, lexicon article text was composed in three tiers:</p>

<h3>Tier 1: Terse Glosses</h3>
<p>A concise English gloss for each lemma, summarizing its range of meaning in a sentence or
two. These were generated by Opus 4.6 from the full evidence set (<a href="https://en.wikipedia.org/wiki/Brown%E2%80%93Driver%E2%80%93Briggs">BDB</a>/<a href="https://en.wikipedia.org/wiki/A_Greek%E2%80%93English_Lexicon">LSJ</a> entries,
multilingual gloss distributions, sense inventory). Coverage: <strong>14,883 of 14,884
lemmas</strong> (99.99%).</p>

<h3>Tier 2: Readable Glosses</h3>
<p>A paragraph-length explanation of the lemma's semantic range, suitable for a dictionary
article. These draw on the same evidence as the terse glosses but provide more context and
usage notes.</p>

<h3>Tier 3: Enriched Sense Descriptions</h3>
<p>For each individual sense, a detailed description explaining what distinguishes this sense
from the lemma's other senses. These include information about typical contexts, translation
patterns, and semantic nuances. Coverage: <strong>20,063 of 20,143 senses</strong> enriched.</p>

<div class="info-box-chirho">
<strong>Cross-gloss refinement:</strong> After initial composition, a refinement pass compared
each lemma's sense descriptions against each other to ensure they were mutually distinguishable
and that no two senses had been described in effectively identical terms.
</div>

<h2>10. Scripture References</h2>

<p>Each sense is linked to its scripture references (the verses where that sense of the word
occurs), providing complete traceability from the lexicon article back to the biblical text.
The current database contains <strong>174,434 sense&ndash;reference links</strong>.</p>

<h2>11. Multilingual Sense Glosses</h2>

<p>Beyond the English descriptions, each sense carries gloss labels in multiple display
languages. The current database holds <strong>348,858 sense&ndash;gloss records</strong> across
17 display languages (English, Spanish, French, German, and others). These are derived from the
most frequent translations observed for each sense cluster in the corresponding language.</p>

<h2>12. Tools and Infrastructure</h2>

<p>The pipeline was built with:</p>

<ul>
<li><strong>Rust</strong> &mdash; hot-path compute (feature materialization, clustering, similarity
matrices, entropy computation) via a workspace of five crates</li>
<li><strong>Bun/TypeScript</strong> &mdash; orchestration, LLM API calls, data import/export,
CLI tools</li>
<li><strong>SQLite</strong> (local, WAL mode) &mdash; primary working database for all intermediate
and final results</li>
<li><strong>Opus 4.6</strong> (Anthropic) &mdash; LLM merge review, sense labeling, gloss
composition</li>
<li><strong>SvelteKit 2</strong> + <strong>Cloudflare Workers</strong> &mdash; the web application
you are reading now</li>
<li><strong>Cloudflare D1</strong> &mdash; production database serving the lexicon</li>
<li><strong>Typst</strong> &mdash; PDF lexicon generation with EzraSIL Hebrew and Gentium Plus
Greek fonts</li>
</ul>

<h2>13. What This Is Not</h2>

<p>This lexicon is <strong>computationally derived</strong>, not hand-curated by a team of
lexicographers over decades. It should be understood as a <em>preliminary draft</em>&mdash;an
evidence-backed starting point for further scholarly refinement, not a finished reference
work. The sense boundaries, while grounded in cross-lingual translation evidence, have not
been exhaustively verified by human experts.</p>

<p>The domain hierarchy was seeded from open-licensed resources (SIL's CC BY-SA 4.0 semantic
domains) and refined computationally. It does not depend on <a href="https://en.wikipedia.org/wiki/Louw%E2%80%93Nida_Lexicon">Louw &amp; Nida's</a>
copyrighted classification, though it follows a similar structural philosophy.</p>

<h2>14. Pipeline Summary</h2>

<table class="pipeline-table-chirho">
<thead>
<tr>
<th>Stage</th>
<th>Input</th>
<th>Output</th>
<th>Method</th>
</tr>
</thead>
<tbody>
<tr>
<td>Import</td>
<td>800K words, 43 langs</td>
<td>7.6M glosses</td>
<td>Postgres &rarr; SQLite</td>
</tr>
<tr>
<td>Materialize</td>
<td>7.6M glosses</td>
<td>7.5M phrases, 11M parts</td>
<td>Rust normalization + encoding</td>
</tr>
<tr>
<td>Cluster</td>
<td>14,639 lemmas</td>
<td>56,976 senses</td>
<td>Agglomerative clustering</td>
</tr>
<tr>
<td>LLM merge (10+)</td>
<td>1,919 lemmas</td>
<td>30,897 senses</td>
<td>Opus 4.6 review</td>
</tr>
<tr>
<td>Auto-merge (2&ndash;9)</td>
<td>Remaining polysemous</td>
<td>26,523 senses</td>
<td>Cross-lingual Jaccard</td>
</tr>
<tr>
<td>Opus re-merge</td>
<td>1,499 lemmas</td>
<td>20,143 senses</td>
<td>Opus 4.6 (4,443 files)</td>
</tr>
<tr>
<td>Refinement</td>
<td>Over-lumped senses</td>
<td>+168 sub-senses</td>
<td>Split detection + reassignment</td>
</tr>
<tr>
<td>Domains</td>
<td>20,143 senses</td>
<td>2,135 domain nodes</td>
<td>Community detection + centroid</td>
</tr>
<tr>
<td>Glosses</td>
<td>Full evidence set</td>
<td>14,883 lemma + 20,063 sense</td>
<td>Opus 4.6 composition</td>
</tr>
</tbody>
</table>

<h2>15. Open Source</h2>

<p>The code, pipeline, and data are available on
<a href="https://github.com/andrewbethchirho/semantic-chirho">GitHub</a>.
The semantic domain ontology is released under CC BY-SA 4.0. To God be the glory.</p>

</div>

<style>
	.article-chirho {
		max-width: 720px;
		line-height: 1.8;
		text-align: justify;
	}
	.article-chirho h2 {
		margin-top: 32px;
		color: var(--accent-chirho);
		font-size: 18px;
	}
	.article-chirho h3 {
		margin-top: 20px;
		font-size: 15px;
		color: var(--fg-chirho);
	}
	.article-chirho p {
		margin: 12px 0;
	}
	.article-chirho ol, .article-chirho ul {
		padding-left: 24px;
	}
	.article-chirho li {
		margin: 8px 0;
	}
	.article-chirho code {
		background: var(--surface-chirho);
		padding: 1px 5px;
		border-radius: 3px;
		font-size: 13px;
	}
	.info-box-chirho {
		background: var(--surface-chirho);
		border-left: 3px solid var(--accent-chirho);
		padding: 12px 16px;
		margin: 16px 0;
		border-radius: 0 6px 6px 0;
		font-size: 14px;
		line-height: 1.6;
	}
	.pipeline-table-chirho {
		margin: 16px 0;
		font-size: 13px;
	}
	.pipeline-table-chirho th {
		text-align: left;
		padding: 8px 12px;
		border-bottom: 2px solid var(--border-chirho);
		font-family: 'Source Sans 3', sans-serif;
		font-size: 12px;
	}
	.pipeline-table-chirho td {
		padding: 6px 12px;
		border-bottom: 1px solid var(--border-chirho);
	}
</style>
