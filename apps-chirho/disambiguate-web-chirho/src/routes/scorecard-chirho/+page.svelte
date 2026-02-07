<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	let { data } = $props();
	let mChirho = $derived(data.metricsChirho);
</script>

<h1>Scorecard Dashboard</h1>

<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 16px;">
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 16px; border-radius: 8px;">
		<div style="font-size: 24px; color: var(--accent-chirho);">{mChirho.coverageChirho}%</div>
		<div style="color: var(--muted-chirho);">Coverage</div>
		<div style="font-size: 11px; color: var(--muted-chirho);">{mChirho.assignedChirho.toLocaleString()} / {mChirho.totalWordsChirho.toLocaleString()}</div>
	</div>
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 16px; border-radius: 8px;">
		<div style="font-size: 24px; color: var(--accent-chirho);">{mChirho.sensesChirho.toLocaleString()}</div>
		<div style="color: var(--muted-chirho);">Senses</div>
	</div>
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 16px; border-radius: 8px;">
		<div style="font-size: 24px; color: var(--accent-chirho);">{mChirho.domainsChirho}</div>
		<div style="color: var(--muted-chirho);">Domains</div>
		<div style="font-size: 11px; color: var(--muted-chirho);">{mChirho.domainAssignmentsChirho.toLocaleString()} assignments</div>
	</div>
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 16px; border-radius: 8px;">
		<div style="font-size: 24px; color: var(--accent-chirho);">{mChirho.pendingChirho}</div>
		<div style="color: var(--muted-chirho);">Pending Review</div>
		<div style="font-size: 11px; color: var(--muted-chirho);">{mChirho.reviewedChirho} reviewed</div>
	</div>
</div>

<h2 style="margin-top: 32px;">Sense Distribution</h2>
<p style="color: var(--muted-chirho);">Number of senses per lemma</p>
<div style="display: flex; align-items: flex-end; gap: 2px; height: 120px; margin-top: 8px;">
	{#each data.distributionChirho as dChirho}
		{@const maxChirho = Math.max(...data.distributionChirho.map((x: any) => x.lemma_count_chirho))}
		{@const heightChirho = (dChirho.lemma_count_chirho / maxChirho) * 100}
		<div style="display: flex; flex-direction: column; align-items: center; flex: 1;">
			<div style="font-size: 10px; color: var(--muted-chirho);">{dChirho.lemma_count_chirho}</div>
			<div style="width: 100%; height: {heightChirho}px; background: var(--accent-chirho); border-radius: 2px 2px 0 0;"></div>
			<div style="font-size: 10px; color: var(--muted-chirho); margin-top: 2px;">{dChirho.sense_count_chirho}</div>
		</div>
	{/each}
</div>

<h2 style="margin-top: 32px;">Domain Distribution</h2>
{#each data.domainDistChirho as dChirho}
	{@const maxDomainChirho = Math.max(...data.domainDistChirho.map((x: any) => x.cnt_chirho))}
	<div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
		<div style="width: 140px; font-size: 12px; text-align: right; color: var(--muted-chirho);">{dChirho.name_chirho}</div>
		<div style="flex: 1; height: 16px; background: var(--surface-chirho); border-radius: 2px; overflow: hidden;">
			<div style="width: {(dChirho.cnt_chirho / maxDomainChirho) * 100}%; height: 100%; background: var(--accent-chirho);"></div>
		</div>
		<div style="width: 60px; font-size: 12px;">{dChirho.cnt_chirho}</div>
	</div>
{/each}
