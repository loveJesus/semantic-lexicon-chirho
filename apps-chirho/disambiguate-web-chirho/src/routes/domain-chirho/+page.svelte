<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	let { data } = $props();
	let expandedMacroChirho = $state<number | null>(null);
	let expandedLnChirho = $state<number | null>(null);

	function lnForMacroChirho(macroIdChirho: number) {
		return data.louwNidaChirho.filter((lnChirho: any) => lnChirho.parent_id_chirho === macroIdChirho);
	}

	function communitiesForLnChirho(lnIdChirho: number) {
		return data.communitiesChirho.filter((cChirho: any) => cChirho.parent_id_chirho === lnIdChirho);
	}

	function toggleMacroChirho(idChirho: number) {
		expandedMacroChirho = expandedMacroChirho === idChirho ? null : idChirho;
		expandedLnChirho = null;
	}

	function toggleLnChirho(idChirho: number) {
		expandedLnChirho = expandedLnChirho === idChirho ? null : idChirho;
	}

	let totalSensesChirho = $derived(data.macro32Chirho.reduce((sChirho: number, dChirho: any) => sChirho + dChirho.sense_count_chirho, 0));
</script>

<h1>Domain Browser</h1>
<p style="color: var(--muted-chirho);">
	3-level hierarchy: {data.macro32Chirho.length} macro &rarr; {data.louwNidaChirho.length} Louw-Nida &rarr; {data.communitiesChirho.length} communities &mdash; {totalSensesChirho.toLocaleString()} senses
</p>

<h2>Macro-32 Domains</h2>
<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
	{#each data.macro32Chirho as macroChirho (macroChirho.domain_id_chirho)}
		{@const isExpandedChirho = expandedMacroChirho === macroChirho.domain_id_chirho}
		<button
			onclick={() => toggleMacroChirho(macroChirho.domain_id_chirho)}
			style="background: {isExpandedChirho ? 'var(--accent-chirho)' : 'var(--surface-chirho)'}; border: 1px solid {isExpandedChirho ? 'var(--accent-chirho)' : 'var(--border-chirho)'}; padding: 12px; border-radius: 8px; cursor: pointer; text-align: left; color: {isExpandedChirho ? '#000' : 'var(--fg-chirho)'}; font-family: inherit; font-size: inherit;"
		>
			<div style="font-weight: bold; font-size: 13px;">{macroChirho.name_chirho.replace(/_/g, ' ')}</div>
			<div style="font-size: 11px; margin-top: 4px; opacity: 0.7;">
				{macroChirho.sense_count_chirho} senses &middot; {macroChirho.ln_count_chirho} L-N groups
			</div>
		</button>
	{/each}
</div>

{#if expandedMacroChirho}
	{@const lnListChirho = lnForMacroChirho(expandedMacroChirho)}
	{@const macroNameChirho = data.macro32Chirho.find((mChirho: any) => mChirho.domain_id_chirho === expandedMacroChirho)?.name_chirho}
	<h2 style="margin-top: 24px;">{macroNameChirho?.replace(/_/g, ' ')} &rarr; Louw-Nida ({lnListChirho.length})</h2>
	<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
		{#each lnListChirho as lnChirho (lnChirho.domain_id_chirho)}
			{@const isLnExpandedChirho = expandedLnChirho === lnChirho.domain_id_chirho}
			<button
				onclick={() => toggleLnChirho(lnChirho.domain_id_chirho)}
				style="background: {isLnExpandedChirho ? '#1a3a5c' : 'var(--surface-chirho)'}; border: 1px solid {isLnExpandedChirho ? 'var(--accent-chirho)' : 'var(--border-chirho)'}; padding: 10px; border-radius: 6px; cursor: pointer; text-align: left; color: var(--fg-chirho); font-family: inherit; font-size: inherit;"
			>
				<div style="font-weight: bold; font-size: 12px; color: var(--accent-chirho);">
					{lnChirho.name_chirho.replace(/^LN\d+_/, '').replace(/_/g, ' ')}
				</div>
				<div style="font-size: 11px; color: var(--muted-chirho); margin-top: 2px;">
					{lnChirho.name_chirho.match(/^LN\d+/)?.[0]} &middot; {lnChirho.sense_count_chirho} senses &middot; {lnChirho.community_count_chirho} communities
				</div>
			</button>
		{/each}
	</div>
{/if}

{#if expandedLnChirho}
	{@const commListChirho = communitiesForLnChirho(expandedLnChirho)}
	{@const lnNameChirho = data.louwNidaChirho.find((lChirho: any) => lChirho.domain_id_chirho === expandedLnChirho)?.name_chirho}
	<h3 style="margin-top: 20px;">{lnNameChirho?.replace(/^LN\d+_/, '').replace(/_/g, ' ')} &rarr; Communities ({commListChirho.length})</h3>
	<table style="width: 100%; border-collapse: collapse; font-size: 13px;">
		<thead>
			<tr style="border-bottom: 2px solid var(--border-chirho);">
				<th style="text-align: left; padding: 6px;">Community</th>
				<th style="text-align: left; padding: 6px;">Description</th>
				<th style="text-align: right; padding: 6px;">Senses</th>
			</tr>
		</thead>
		<tbody>
			{#each commListChirho as cChirho (cChirho.domain_id_chirho)}
				<tr style="border-bottom: 1px solid var(--border-chirho);">
					<td style="padding: 6px; color: var(--accent-chirho);">{cChirho.name_chirho}</td>
					<td style="padding: 6px; color: var(--muted-chirho); max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{cChirho.description_chirho || '—'}</td>
					<td style="text-align: right; padding: 6px;">{cChirho.sense_count_chirho}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
