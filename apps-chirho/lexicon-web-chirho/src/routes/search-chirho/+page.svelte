<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	let { data } = $props();
</script>

<style>
	.search-input-chirho {
		flex: 1;
		min-width: 200px;
		padding: 8px 12px;
		background: #fff;
		border: 1px solid var(--border-chirho);
		color: var(--fg-chirho);
		border-radius: 6px;
		font-family: inherit;
		font-size: 14px;
	}
	.search-select-chirho {
		padding: 8px 12px;
		background: #fff;
		border: 1px solid var(--border-chirho);
		color: var(--fg-chirho);
		border-radius: 6px;
		font-family: 'Source Sans 3', sans-serif;
		font-size: 13px;
	}
	.search-btn-chirho {
		padding: 8px 20px;
		background: var(--accent-chirho);
		color: #fff;
		border: none;
		border-radius: 6px;
		font-weight: bold;
		cursor: pointer;
		font-family: 'Source Sans 3', sans-serif;
		font-size: 13px;
	}
	.search-btn-chirho:hover {
		opacity: 0.9;
	}
</style>

<h1>Search Lexicon</h1>

<form method="get" style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px;">
	<input
		type="text"
		name="q"
		value={data.queryChirho}
		placeholder="Search lemma ID or gloss..."
		class="search-input-chirho"
	/>
	<select name="lang" class="search-select-chirho">
		<option value="">All languages</option>
		<option value="heb" selected={data.langFilterChirho === 'heb'}>Hebrew</option>
		<option value="arc" selected={data.langFilterChirho === 'arc'}>Aramaic</option>
		<option value="grc" selected={data.langFilterChirho === 'grc'}>Greek</option>
	</select>
	<select name="pos" class="search-select-chirho">
		<option value="">All POS</option>
		{#each data.posOptionsChirho as posChirho}
			<option value={posChirho} selected={data.posFilterChirho === posChirho}>{posChirho}</option>
		{/each}
	</select>
	<button type="submit" class="search-btn-chirho">Search</button>
</form>

<p style="color: var(--muted-chirho); margin-bottom: 12px; font-family: 'Source Sans 3', sans-serif; font-size: 13px;">
	{data.totalChirho.toLocaleString()} results
	{#if data.totalPagesChirho > 1}
		&middot; Page {data.pageChirho} of {data.totalPagesChirho}
	{/if}
</p>

<table>
	<thead>
		<tr style="border-bottom: 2px solid var(--border-chirho);">
			<th style="text-align: left; padding: 8px 6px;">ID</th>
			<th style="text-align: left; padding: 8px 6px;">Gloss</th>
			<th style="text-align: left; padding: 8px 6px;">Lang</th>
			<th style="text-align: left; padding: 8px 6px;">POS</th>
			<th style="text-align: right; padding: 8px 6px;">Senses</th>
			<th style="text-align: right; padding: 8px 6px;">Occurrences</th>
		</tr>
	</thead>
	<tbody>
		{#each data.resultsChirho as rChirho}
			<tr style="border-bottom: 1px solid var(--border-chirho);">
				<td style="padding: 8px 6px;"><a href="/lemma-chirho/{rChirho.lemma_id_chirho}">{rChirho.lemma_id_chirho}</a></td>
				<td style="padding: 8px 6px;">{rChirho.gloss_clean_chirho || '—'}</td>
				<td style="padding: 8px 6px; color: var(--muted-chirho); font-size: 13px;">{rChirho.language_chirho}</td>
				<td style="padding: 8px 6px; color: var(--muted-chirho); font-style: italic;">{rChirho.pos_chirho || '—'}</td>
				<td style="text-align: right; padding: 8px 6px;">{rChirho.sense_count_chirho}</td>
				<td style="text-align: right; padding: 8px 6px;">{rChirho.occurrence_count_chirho}</td>
			</tr>
		{/each}
	</tbody>
</table>

{#if data.totalPagesChirho > 1}
	<div style="display: flex; gap: 8px; justify-content: center; margin-top: 24px; font-family: 'Source Sans 3', sans-serif; font-size: 13px;">
		{#if data.pageChirho > 1}
			<a
				href="/search-chirho?q={encodeURIComponent(data.queryChirho)}&lang={data.langFilterChirho}&pos={data.posFilterChirho}&page={data.pageChirho - 1}"
				style="padding: 6px 14px; background: var(--surface-chirho); border: 1px solid var(--border-chirho); border-radius: 4px;"
			>Prev</a>
		{/if}
		<span style="padding: 6px 14px; color: var(--muted-chirho);">{data.pageChirho} / {data.totalPagesChirho}</span>
		{#if data.pageChirho < data.totalPagesChirho}
			<a
				href="/search-chirho?q={encodeURIComponent(data.queryChirho)}&lang={data.langFilterChirho}&pos={data.posFilterChirho}&page={data.pageChirho + 1}"
				style="padding: 6px 14px; background: var(--surface-chirho); border: 1px solid var(--border-chirho); border-radius: 4px;"
			>Next</a>
		{/if}
	</div>
{/if}
