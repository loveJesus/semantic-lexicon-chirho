<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	import { tChirho, appendLangChirho } from '$lib/i18n-chirho';

	let { data } = $props();
	let langChirho = $derived(data.langChirho as string);
	let expandedChirho = $state<Record<string, boolean>>({});

	function toggleChirho(idChirho: string) {
		expandedChirho = { ...expandedChirho, [idChirho]: !expandedChirho[idChirho] };
	}

	function truncateChirho(textChirho: string, maxChirho: number): string {
		if (textChirho.length <= maxChirho) return textChirho;
		return textChirho.slice(0, maxChirho).trimEnd() + '...';
	}
</script>

<h1>{tChirho(langChirho, 'siteTitle')}</h1>
<p style="color: var(--muted-chirho);">{tChirho(langChirho, 'siteSubtitle')}</p>

<div style="display: flex; gap: 12px; flex-wrap: wrap; margin-top: 20px; margin-bottom: 8px;">
	<a href={appendLangChirho('/bible-chirho/gen.1', langChirho)} style="display: inline-block; background: var(--accent-chirho); color: #fff; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-family: 'Source Sans 3', sans-serif; font-size: 16px; text-decoration: none; letter-spacing: 0.3px;">{tChirho(langChirho, 'readTheBible')}</a>
	<a href={appendLangChirho('/domain-chirho', langChirho)} style="display: inline-block; background: var(--surface-chirho); color: var(--accent-chirho); padding: 14px 28px; border-radius: 8px; font-weight: 600; font-family: 'Source Sans 3', sans-serif; font-size: 16px; border: 1px solid var(--border-chirho); text-decoration: none;">{tChirho(langChirho, 'seeSemanticDomains')}</a>
	<a href="/api-chirho/pdf-chirho" download="lexicon-chirho.pdf" style="display: inline-flex; align-items: center; background: var(--surface-chirho); color: var(--accent-chirho); padding: 14px 28px; border-radius: 8px; font-weight: 600; font-family: 'Source Sans 3', sans-serif; font-size: 16px; border: 1px solid var(--border-chirho); text-decoration: none;">{tChirho(langChirho, 'downloadPdfEng')}</a>
	<a href="/api-chirho/pdf-chirho?lang=spa" download="lexicon-chirho-spa.pdf" style="display: inline-flex; align-items: center; background: var(--surface-chirho); color: var(--accent-chirho); padding: 14px 28px; border-radius: 8px; font-weight: 600; font-family: 'Source Sans 3', sans-serif; font-size: 16px; border: 1px solid var(--border-chirho); text-decoration: none;">{tChirho(langChirho, 'downloadPdfSpa')}</a>
</div>

<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 24px;">
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 16px; border-radius: 8px;">
		<div style="font-size: 24px; font-weight: bold; color: var(--accent-chirho); font-family: 'Source Sans 3', sans-serif;">{data.countsChirho.lemmasChirho.toLocaleString()}</div>
		<div style="color: var(--muted-chirho); font-family: 'Source Sans 3', sans-serif; font-size: 13px;">{tChirho(langChirho, 'lemmas')}</div>
	</div>
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 16px; border-radius: 8px;">
		<div style="font-size: 24px; font-weight: bold; color: var(--accent-chirho); font-family: 'Source Sans 3', sans-serif;">{data.countsChirho.sensesChirho.toLocaleString()}</div>
		<div style="color: var(--muted-chirho); font-family: 'Source Sans 3', sans-serif; font-size: 13px;">{tChirho(langChirho, 'senses')}</div>
	</div>
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 16px; border-radius: 8px;">
		<div style="font-size: 24px; font-weight: bold; color: var(--accent-chirho); font-family: 'Source Sans 3', sans-serif;">{data.countsChirho.glossesChirho.toLocaleString()}</div>
		<div style="color: var(--muted-chirho); font-family: 'Source Sans 3', sans-serif; font-size: 13px;">{tChirho(langChirho, 'glossRecords')}</div>
	</div>
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 16px; border-radius: 8px;">
		<div style="font-size: 24px; font-weight: bold; color: var(--accent-chirho); font-family: 'Source Sans 3', sans-serif;">{data.countsChirho.refsChirho.toLocaleString()}</div>
		<div style="color: var(--muted-chirho); font-family: 'Source Sans 3', sans-serif; font-size: 13px;">{tChirho(langChirho, 'references')}</div>
	</div>
</div>

{#snippet lemmaCardChirho(lChirho: Record<string, any>)}
	{@const idChirho = lChirho.lemma_id_chirho as string}
	{@const terseChirho = (lChirho.gloss_terse_chirho || lChirho.gloss_clean_chirho || '') as string}
	{@const enrichedChirho = (data.enrichedMapChirho[idChirho] || '') as string}
	{@const isExpandedChirho = expandedChirho[idChirho] ?? false}
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); border-radius: 10px; padding: 16px 18px; display: flex; flex-direction: column; gap: 6px;">
		<div style="display: flex; justify-content: space-between; align-items: baseline;">
			<a href={appendLangChirho(`/lemma-chirho/${idChirho}`, langChirho)} style="font-weight: bold; font-size: 17px; text-decoration: none; color: var(--accent-chirho); font-family: 'Source Sans 3', sans-serif;">
				{idChirho}
			</a>
			<div style="display: flex; gap: 10px; align-items: baseline;">
				{#if lChirho.pos_chirho}
					<span style="color: var(--muted-chirho); font-style: italic; font-size: 12px;">{lChirho.pos_chirho}</span>
				{/if}
				<span style="font-size: 12px; color: var(--muted-chirho);">{(lChirho.occurrence_count_chirho as number).toLocaleString()}&times;</span>
				<span style="font-size: 12px; background: var(--accent-chirho); color: #fff; padding: 1px 7px; border-radius: 10px;">{lChirho.sense_count_chirho} {tChirho(langChirho, 'senses').toLowerCase()}</span>
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
				{isExpandedChirho ? tChirho(langChirho, 'showLess') : tChirho(langChirho, 'readMore')}
			</button>
			<a href={appendLangChirho(`/lemma-chirho/${idChirho}`, langChirho)} style="font-size: 13px; color: var(--accent-chirho); text-decoration: none;">
				{tChirho(langChirho, 'viewEntry')} &rarr;
			</a>
		</div>
	</div>
{/snippet}

<h2 style="margin-top: 32px;">{tChirho(langChirho, 'someRandomLemmas')}</h2>

<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; margin-top: 12px;">
	{#each data.randomLemmasChirho as lChirho}
		{@render lemmaCardChirho(lChirho as Record<string, any>)}
	{/each}
</div>

<h2 style="margin-top: 32px;">{tChirho(langChirho, 'mostFrequentLemmas')}</h2>

<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; margin-top: 12px;">
	{#each data.topLemmasChirho as lChirho}
		{@render lemmaCardChirho(lChirho as Record<string, any>)}
	{/each}
</div>

<div style="margin-top: 20px; text-align: center;">
	<a href={appendLangChirho('/search-chirho', langChirho)} style="display: inline-block; background: var(--accent-chirho); color: #fff; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-family: 'Source Sans 3', sans-serif; font-size: 15px; text-decoration: none;">{tChirho(langChirho, 'viewFullLexicon')}</a>
</div>
