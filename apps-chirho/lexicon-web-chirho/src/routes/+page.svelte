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
</script>

<h1>Biblical Lexicon</h1>
<p style="color: var(--muted-chirho);">Hebrew, Aramaic &amp; Greek lexicon with multilingual glosses and semantic domains</p>

<div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 20px; margin-bottom: 8px;">
	<a href="/bible-chirho/gen.1" style="display: inline-block; background: var(--accent-chirho); color: #fff; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-family: 'Source Sans 3', sans-serif; font-size: 16px; text-decoration: none; letter-spacing: 0.3px;">Read the Bible</a>
	<a href="/domain-chirho" style="display: inline-block; background: var(--surface-chirho); color: var(--accent-chirho); padding: 14px 28px; border-radius: 8px; font-weight: 600; font-family: 'Source Sans 3', sans-serif; font-size: 16px; border: 1px solid var(--border-chirho); text-decoration: none;">See Semantic Domains</a>
	<a href="/api-chirho/pdf-chirho" download="lexicon-chirho.pdf" style="display: inline-flex; align-items: center; background: var(--surface-chirho); color: var(--accent-chirho); padding: 14px 28px; border-radius: 8px; font-weight: 600; font-family: 'Source Sans 3', sans-serif; font-size: 16px; border: 1px solid var(--border-chirho); text-decoration: none;">Download PDF in English (more languages coming God willing)</a>
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

<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; margin-top: 12px;">
	{#each data.topLemmasChirho as lChirho}
		{@const idChirho = (lChirho as Record<string, any>).lemma_id_chirho as string}
		{@const terseChirho = ((lChirho as Record<string, any>).gloss_terse_chirho || (lChirho as Record<string, any>).gloss_clean_chirho || '') as string}
		{@const enrichedChirho = (data.enrichedMapChirho[idChirho] || '') as string}
		{@const isExpandedChirho = expandedChirho[idChirho] ?? false}
		<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); border-radius: 10px; padding: 16px 18px; display: flex; flex-direction: column; gap: 6px;">
			<div style="display: flex; justify-content: space-between; align-items: baseline;">
				<a href="/lemma-chirho/{idChirho}" style="font-weight: bold; font-size: 17px; text-decoration: none; color: var(--accent-chirho); font-family: 'Source Sans 3', sans-serif;">
					{idChirho}
				</a>
				<div style="display: flex; gap: 10px; align-items: baseline;">
					{#if (lChirho as Record<string, any>).pos_chirho}
						<span style="color: var(--muted-chirho); font-style: italic; font-size: 12px;">{(lChirho as Record<string, any>).pos_chirho}</span>
					{/if}
					<span style="font-size: 12px; color: var(--muted-chirho);">{((lChirho as Record<string, any>).occurrence_count_chirho as number).toLocaleString()}&times;</span>
					<span style="font-size: 12px; background: var(--accent-chirho); color: #fff; padding: 1px 7px; border-radius: 10px;">{(lChirho as Record<string, any>).sense_count_chirho} senses</span>
				</div>
			</div>

			<div style="font-style: italic; font-size: 14px; color: var(--fg-chirho); line-height: 1.4;">
				{#if isExpandedChirho}
					{terseChirho}
				{:else}
					{truncateChirho(terseChirho, 160)}
				{/if}
			</div>

			{#if enrichedChirho}
				<div style="font-size: 13px; color: var(--muted-chirho); line-height: 1.45; margin-top: 2px;">
					{#if isExpandedChirho}
						{enrichedChirho}
					{:else}
						{truncateChirho(enrichedChirho, 140)}
					{/if}
				</div>
			{/if}

			<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
				<button
					onclick={() => toggleChirho(idChirho)}
					style="background: none; border: none; color: var(--accent-chirho); cursor: pointer; font-size: 13px; padding: 0; font-family: 'Source Sans 3', sans-serif;"
				>
					{isExpandedChirho ? 'Show less' : 'Read more'}
				</button>
				<a href="/lemma-chirho/{idChirho}" style="font-size: 13px; color: var(--accent-chirho); text-decoration: none;">
					View entry &rarr;
				</a>
			</div>
		</div>
	{/each}
</div>

<div style="margin-top: 20px; text-align: center;">
	<a href="/search-chirho" style="display: inline-block; background: var(--accent-chirho); color: #fff; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-family: 'Source Sans 3', sans-serif; font-size: 15px; text-decoration: none;">View Full Lexicon</a>
</div>
