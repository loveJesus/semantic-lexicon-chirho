<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	let { data } = $props();
</script>

<h1>Lemma Explorer</h1>

<form method="get" style="margin-bottom: 20px;">
	<input
		type="text"
		name="q"
		value={data.searchChirho}
		placeholder="Search lemmas (e.g. H1696, dabar)..."
		style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); color: var(--fg-chirho); padding: 8px 16px; border-radius: 6px; width: 300px;"
	/>
	<button type="submit" style="background: var(--accent-chirho); color: #000; padding: 8px 16px; border-radius: 6px; border: none; cursor: pointer;">Search</button>
</form>

<p style="color: var(--muted-chirho);">
	Showing {data.lemmasChirho.length} of {data.totalChirho} lemmas (page {data.pageChirho}/{data.totalPagesChirho})
</p>

<table style="width: 100%; border-collapse: collapse;">
	<thead>
		<tr style="border-bottom: 2px solid var(--border-chirho);">
			<th style="text-align: left; padding: 8px;">Lemma ID</th>
			<th style="text-align: left; padding: 8px;">Gloss</th>
			<th style="text-align: left; padding: 8px;">POS</th>
			<th style="text-align: right; padding: 8px;">Senses</th>
			<th style="text-align: right; padding: 8px;">Occurrences</th>
		</tr>
	</thead>
	<tbody>
		{#each data.lemmasChirho as lemmaChirho}
			<tr style="border-bottom: 1px solid var(--border-chirho);">
				<td style="padding: 8px;">
					<a href="/lemma-chirho/{lemmaChirho.id_chirho}">{lemmaChirho.id_chirho}</a>
				</td>
				<td style="padding: 8px; max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
					{lemmaChirho.gloss_chirho || '-'}
				</td>
				<td style="padding: 8px; color: var(--muted-chirho);">{lemmaChirho.pos_chirho || '-'}</td>
				<td style="text-align: right; padding: 8px; color: var(--accent-chirho);">{lemmaChirho.sense_count_chirho}</td>
				<td style="text-align: right; padding: 8px;">{lemmaChirho.occ_count_chirho}</td>
			</tr>
		{/each}
	</tbody>
</table>

<div style="margin-top: 16px; display: flex; gap: 8px;">
	{#if data.pageChirho > 1}
		<a href="/lemma-chirho?page={data.pageChirho - 1}&q={data.searchChirho}" style="padding: 6px 12px; background: var(--surface-chirho); border: 1px solid var(--border-chirho); border-radius: 4px;">Prev</a>
	{/if}
	{#if data.pageChirho < data.totalPagesChirho}
		<a href="/lemma-chirho?page={data.pageChirho + 1}&q={data.searchChirho}" style="padding: 6px 12px; background: var(--surface-chirho); border: 1px solid var(--border-chirho); border-radius: 4px;">Next</a>
	{/if}
</div>
