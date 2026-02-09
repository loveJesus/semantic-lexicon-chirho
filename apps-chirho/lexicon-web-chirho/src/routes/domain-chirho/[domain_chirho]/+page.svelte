<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	let { data } = $props();

	const HIERARCHY_LABELS_CHIRHO: Record<string, string> = {
		macro32: 'Macro-32 Domain',
		louw_nida: 'Louw-Nida Category',
		community: 'Community Cluster'
	};

	const HIERARCHY_COLORS_CHIRHO: Record<string, string> = {
		macro32: 'var(--green-chirho)',
		louw_nida: 'var(--blue-chirho)',
		community: 'var(--purple-chirho)'
	};

	let colorChirho = $derived(HIERARCHY_COLORS_CHIRHO[data.hierarchyChirho]);
</script>

<style>
	.entry-card-chirho {
		border-bottom: 1px solid var(--border-chirho);
		padding: 14px 0;
	}
	.entry-gloss-chirho {
		font-size: 15px;
		line-height: 1.6;
		text-align: justify;
		margin-bottom: 6px;
	}
	.entry-meta-chirho {
		font-family: 'Source Sans 3', sans-serif;
		font-size: 13px;
		color: var(--muted-chirho);
		display: flex;
		flex-wrap: wrap;
		gap: 4px 16px;
		align-items: baseline;
	}
	.entry-meta-chirho a {
		font-weight: 600;
	}
	.meta-label-chirho {
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.3px;
		color: var(--muted-chirho);
		opacity: 0.7;
	}
</style>

<div style="margin-bottom: 12px; font-family: 'Source Sans 3', sans-serif; font-size: 13px;">
	<a href="/domain-chirho" style="color: var(--muted-chirho);">Domains</a>
	<span style="color: var(--border-chirho);"> / </span>
	<span style="color: {colorChirho}; font-weight: 600;">{data.domainNameChirho}</span>
</div>

<h1 style="color: {colorChirho}; margin-bottom: 4px; font-size: 26px;">{data.domainNameChirho}</h1>
<p style="color: var(--muted-chirho); margin-top: 0; font-family: 'Source Sans 3', sans-serif; font-size: 14px;">
	{HIERARCHY_LABELS_CHIRHO[data.hierarchyChirho]}
	&middot; {data.totalSensesChirho} senses
	&middot; {data.lemmasChirho.length} lemmas
</p>

{#if data.childrenChirho.length > 0}
	<h2 style="margin-top: 24px; font-size: 14px; color: var(--muted-chirho);">Sub-domains</h2>
	<div style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 24px;">
		{#each data.childrenChirho as cChirho}
			<a href="/domain-chirho/{encodeURIComponent(String(cChirho.name_chirho))}"
				style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 4px 12px; border-radius: 4px; font-size: 13px; font-family: 'Source Sans 3', sans-serif;">
				{cChirho.name_chirho}
				<span style="color: var(--muted-chirho);">({cChirho.sense_count_chirho})</span>
			</a>
		{/each}
	</div>
{/if}

<h2 style="margin-top: 16px; font-size: 15px; color: var(--muted-chirho);">Lemmas in this domain</h2>

{#each data.lemmasChirho as lChirho}
	<div class="entry-card-chirho">
		<div class="entry-gloss-chirho">
			{lChirho.gloss_clean_chirho || '—'}
		</div>
		<div class="entry-meta-chirho">
			<a href="/lemma-chirho/{lChirho.lemma_id_chirho}">{lChirho.lemma_id_chirho}</a>
			{#if lChirho.pos_chirho}
				<span><span class="meta-label-chirho">pos</span> <em>{lChirho.pos_chirho}</em></span>
			{/if}
			<span><span class="meta-label-chirho">senses here</span> <strong>{lChirho.sense_in_domain_chirho}</strong></span>
			<span><span class="meta-label-chirho">total</span> {lChirho.sense_count_chirho}</span>
			<span><span class="meta-label-chirho">occ.</span> {lChirho.occurrence_count_chirho}</span>
		</div>
	</div>
{/each}
