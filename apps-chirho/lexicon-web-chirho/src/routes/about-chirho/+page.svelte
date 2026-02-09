<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->

<h1>About the Biblical Lexicon</h1>

<div class="article-chirho">

<p><em>"For God so loved the world that he gave his only begotten Son, that whoever believes in him
should not perish but have eternal life."</em> &mdash; John 3:16</p>

<h2>What is this?</h2>

<p>This is a computationally-derived lexicon of Biblical Hebrew, Aramaic, and Greek.
Every word occurrence in Scripture has been mapped through a three-stage pipeline:</p>

<ol>
<li><strong>Token &rarr; Sense.</strong> Each of the 448,269 word occurrences is assigned to a
specific lexical sense of its lemma, using multilingual translation signatures from 43
parallel Bible translations as the primary evidence signal.</li>
<li><strong>Sense &rarr; Domain.</strong> Each of the 20,143 induced senses is classified into a
three-level semantic domain hierarchy: 32 macro-domains, 93 Louw-Nida style supersense
categories, and 1,236 fine-grained community clusters.</li>
<li><strong>Article composition.</strong> For each of the 14,884 lemmas, a lexicon article is
composed from the sense inventory, multilingual glosses, domain classifications, and
scripture references.</li>
</ol>

<h2>Methodology</h2>

<p>The sense inventory was built using agglomerative clustering on cross-lingual translation
features (7.5 million glosses across 43 languages), followed by multiple rounds of LLM-assisted
merge review and automated cross-lingual Jaccard merging. The domain hierarchy combines a
32-category macro-domain system with Louw &amp; Nida style semantic categories and
community-detection fine clusters.</p>

<h2>Data</h2>

<table style="margin: 16px 0;">
<tbody>
<tr style="border-bottom: 1px solid var(--border-chirho);">
  <td style="padding: 6px 16px 6px 0; color: var(--muted-chirho); font-weight: bold;">Lemmas</td>
  <td style="padding: 6px 0;">14,884 (Hebrew, Aramaic, Greek)</td>
</tr>
<tr style="border-bottom: 1px solid var(--border-chirho);">
  <td style="padding: 6px 16px 6px 0; color: var(--muted-chirho); font-weight: bold;">Senses</td>
  <td style="padding: 6px 0;">20,143 induced senses</td>
</tr>
<tr style="border-bottom: 1px solid var(--border-chirho);">
  <td style="padding: 6px 16px 6px 0; color: var(--muted-chirho); font-weight: bold;">Gloss records</td>
  <td style="padding: 6px 0;">346,087 across 17 display languages</td>
</tr>
<tr style="border-bottom: 1px solid var(--border-chirho);">
  <td style="padding: 6px 16px 6px 0; color: var(--muted-chirho); font-weight: bold;">Word occurrences</td>
  <td style="padding: 6px 0;">448,269</td>
</tr>
<tr style="border-bottom: 1px solid var(--border-chirho);">
  <td style="padding: 6px 16px 6px 0; color: var(--muted-chirho); font-weight: bold;">Macro domains</td>
  <td style="padding: 6px 0;">32</td>
</tr>
<tr style="border-bottom: 1px solid var(--border-chirho);">
  <td style="padding: 6px 16px 6px 0; color: var(--muted-chirho); font-weight: bold;">L-N categories</td>
  <td style="padding: 6px 0;">93</td>
</tr>
<tr>
  <td style="padding: 6px 16px 6px 0; color: var(--muted-chirho); font-weight: bold;">Fine clusters</td>
  <td style="padding: 6px 0;">1,236</td>
</tr>
</tbody>
</table>

<h2>Source</h2>

<p>This project is open source. The code, pipeline, and data are available on
<a href="https://github.com/andrewbethchirho/semantic-chirho">GitHub</a>.</p>

<p>Built with SvelteKit, Cloudflare Workers, D1, and Rust. Part of the
<a href="https://bible.systems">bible.systems</a> family of tools for Bible translation
and study.</p>

</div>

<style>
	.article-chirho {
		max-width: 680px;
		line-height: 1.8;
		text-align: justify;
	}
	.article-chirho h2 {
		margin-top: 28px;
		color: var(--accent-chirho);
		font-size: 18px;
	}
	.article-chirho p {
		margin: 12px 0;
	}
	.article-chirho ol {
		padding-left: 24px;
	}
	.article-chirho li {
		margin: 8px 0;
	}
</style>
