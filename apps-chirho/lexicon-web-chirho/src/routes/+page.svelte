<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	let { data } = $props();
</script>

<h1>Biblical Lexicon</h1>
<p style="color: var(--muted-chirho);">Hebrew, Aramaic &amp; Greek lexicon with multilingual glosses and semantic domains</p>

<div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 20px; margin-bottom: 8px;">
	<a href="/bible-chirho/gen.1" style="display: inline-block; background: var(--accent-chirho); color: #fff; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-family: 'Source Sans 3', sans-serif; font-size: 16px; text-decoration: none; letter-spacing: 0.3px;">Read the Bible</a>
	<a href="/domain-chirho" style="display: inline-block; background: var(--surface-chirho); color: var(--accent-chirho); padding: 14px 28px; border-radius: 8px; font-weight: 600; font-family: 'Source Sans 3', sans-serif; font-size: 16px; border: 1px solid var(--border-chirho); text-decoration: none;">See Semantic Domains</a>
	<span style="display: inline-flex; align-items: center; background: var(--surface-chirho); color: var(--muted-chirho); padding: 14px 28px; border-radius: 8px; font-family: 'Source Sans 3', sans-serif; font-size: 14px; border: 1px solid var(--border-chirho); cursor: default;">Download PDF in English (more languages coming God willing) &mdash; coming soon</span>
</div>

<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 24px;">
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 16px; border-radius: 8px;">
		<div style="font-size: 24px; font-weight: bold; color: var(--accent-chirho); font-family: 'Source Sans 3', sans-serif;">{data.countsChirho.lemmasChirho.toLocaleString()}</div>
		<div style="color: var(--muted-chirho); font-family: 'Source Sans 3', sans-serif; font-size: 13px;">Lemmas</div>
	</div>
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 16px; border-radius: 8px;">
		<div style="font-size: 24px; font-weight: bold; color: var(--accent-chirho); font-family: 'Source Sans 3', sans-serif;">{data.countsChirho.sensesChirho.toLocaleString()}</div>
		<div style="color: var(--muted-chirho); font-family: 'Source Sans 3', sans-serif; font-size: 13px;">Senses</div>
	</div>
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 16px; border-radius: 8px;">
		<div style="font-size: 24px; font-weight: bold; color: var(--accent-chirho); font-family: 'Source Sans 3', sans-serif;">{data.countsChirho.glossesChirho.toLocaleString()}</div>
		<div style="color: var(--muted-chirho); font-family: 'Source Sans 3', sans-serif; font-size: 13px;">Gloss Records</div>
	</div>
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 16px; border-radius: 8px;">
		<div style="font-size: 24px; font-weight: bold; color: var(--accent-chirho); font-family: 'Source Sans 3', sans-serif;">{data.countsChirho.refsChirho.toLocaleString()}</div>
		<div style="color: var(--muted-chirho); font-family: 'Source Sans 3', sans-serif; font-size: 13px;">References</div>
	</div>
</div>

<h2 style="margin-top: 32px;">Most Frequent Lemmas</h2>
<table>
	<thead>
		<tr style="border-bottom: 2px solid var(--border-chirho);">
			<th style="text-align: left; padding: 8px 6px;">ID</th>
			<th style="text-align: left; padding: 8px 6px;">Gloss</th>
			<th style="text-align: left; padding: 8px 6px;">POS</th>
			<th style="text-align: right; padding: 8px 6px;">Senses</th>
			<th style="text-align: right; padding: 8px 6px;">Occurrences</th>
		</tr>
	</thead>
	<tbody>
		{#each data.topLemmasChirho as lChirho}
			<tr style="border-bottom: 1px solid var(--border-chirho);">
				<td style="padding: 8px 6px;"><a href="/lemma-chirho/{lChirho.lemma_id_chirho}">{lChirho.lemma_id_chirho}</a></td>
				<td style="padding: 8px 6px;">{lChirho.gloss_clean_chirho || '—'}</td>
				<td style="padding: 8px 6px; color: var(--muted-chirho); font-style: italic;">{lChirho.pos_chirho || '—'}</td>
				<td style="text-align: right; padding: 8px 6px;">{lChirho.sense_count_chirho}</td>
				<td style="text-align: right; padding: 8px 6px;">{lChirho.occurrence_count_chirho}</td>
			</tr>
		{/each}
	</tbody>
</table>

<div style="margin-top: 24px;">
	<a href="/search-chirho" style="display: inline-block; background: var(--accent-chirho); color: #fff; padding: 10px 20px; border-radius: 6px; font-weight: bold; font-family: 'Source Sans 3', sans-serif; font-size: 14px;">Search Lexicon</a>
</div>
