<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	let { data } = $props();
	let expandedChirho = $state<Record<string, boolean>>({});

	function toggleChirho(idChirho: string) {
		expandedChirho = { ...expandedChirho, [idChirho]: !expandedChirho[idChirho] };
	}

	function truncateChirho(textChirho: string, maxChirho: number): string {
		if (textChirho.length <= maxChirho) return textChirho;
		return textChirho.slice(0, maxChirho).trimEnd() + '...';
	}

	function langLabelChirho(codeChirho: string): string {
		if (codeChirho === 'heb') return 'Hebrew';
		if (codeChirho === 'arc') return 'Aramaic';
		if (codeChirho === 'grc') return 'Greek';
		return codeChirho;
	}
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
	.result-card-chirho {
		background: var(--surface-chirho);
		border: 1px solid var(--border-chirho);
		border-radius: 10px;
		padding: 0;
		overflow: hidden;
	}
	.result-header-chirho {
		display: flex;
		align-items: baseline;
		gap: 12px;
		flex-wrap: wrap;
		padding: 12px 18px;
		border-bottom: 1px solid var(--border-chirho);
		background: color-mix(in srgb, var(--surface-chirho), var(--border-chirho) 15%);
	}
	.result-body-chirho {
		padding: 12px 18px;
	}
	.meta-tag-chirho {
		font-size: 12px;
		color: var(--muted-chirho);
		font-family: 'Source Sans 3', sans-serif;
	}
	.sense-badge-chirho {
		font-size: 12px;
		background: var(--accent-chirho);
		color: #fff;
		padding: 1px 7px;
		border-radius: 10px;
		font-family: 'Source Sans 3', sans-serif;
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

<div style="display: flex; flex-direction: column; gap: 12px;">
	{#each data.resultsChirho as rChirho}
		{@const idChirho = (rChirho as Record<string, any>).lemma_id_chirho as string}
		{@const terseChirho = ((rChirho as Record<string, any>).gloss_terse_chirho || '') as string}
		{@const cleanChirho = ((rChirho as Record<string, any>).gloss_clean_chirho || '') as string}
		{@const glossChirho = terseChirho || cleanChirho}
		{@const isExpandedChirho = expandedChirho[idChirho] ?? false}
		<div class="result-card-chirho">
			<div class="result-header-chirho">
				<a href="/lemma-chirho/{idChirho}" style="font-weight: bold; font-size: 17px; text-decoration: none; color: var(--accent-chirho); font-family: 'Source Sans 3', sans-serif;">
					{idChirho}
				</a>
				<span class="meta-tag-chirho">{langLabelChirho((rChirho as Record<string, any>).language_chirho as string)}</span>
				{#if (rChirho as Record<string, any>).pos_chirho}
					<span class="meta-tag-chirho" style="font-style: italic;">{(rChirho as Record<string, any>).pos_chirho}</span>
				{/if}
				<span class="meta-tag-chirho">{((rChirho as Record<string, any>).occurrence_count_chirho as number).toLocaleString()} occurrences</span>
				<span class="sense-badge-chirho">{(rChirho as Record<string, any>).sense_count_chirho} senses</span>
			</div>
			<div class="result-body-chirho">
				{#if glossChirho}
					<div style="font-size: 14px; color: var(--fg-chirho); line-height: 1.5;">
						{#if isExpandedChirho}
							{glossChirho}
						{:else}
							{truncateChirho(glossChirho, 240)}
						{/if}
					</div>
					{#if glossChirho.length > 240}
						<button
							onclick={() => toggleChirho(idChirho)}
							style="background: none; border: none; color: var(--accent-chirho); cursor: pointer; font-size: 13px; padding: 0; margin-top: 6px; font-family: 'Source Sans 3', sans-serif;"
						>
							{isExpandedChirho ? 'Show less' : 'Read more'}
						</button>
					{/if}
				{:else}
					<span style="color: var(--muted-chirho); font-size: 14px;">&mdash;</span>
				{/if}
			</div>
		</div>
	{/each}
</div>

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
