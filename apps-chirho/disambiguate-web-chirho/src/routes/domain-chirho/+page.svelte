<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	let { data } = $props();
	let supersensesChirho = $derived(data.domainsChirho.filter((d: any) => d.level_chirho === 0) as any[]);
	let fineDomainsChirho = $derived(data.domainsChirho.filter((d: any) => d.level_chirho === 1) as any[]);
</script>

<h1>Domain Browser</h1>
<p style="color: var(--muted-chirho);">{data.domainsChirho.length} domains ({supersensesChirho.length} supersenses, {fineDomainsChirho.length} fine domains)</p>

<h2>Supersenses</h2>
<div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;">
	{#each supersensesChirho as domainChirho (domainChirho.domain_id_chirho)}
		<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 14px; border-radius: 8px;">
			<div style="font-weight: bold; color: var(--accent-chirho);">{domainChirho.name_chirho}</div>
			<div style="color: var(--muted-chirho); font-size: 12px; margin-top: 4px;">{domainChirho.description_chirho || ''}</div>
			<div style="margin-top: 8px; font-size: 13px;">{domainChirho.sense_count_chirho} senses</div>
			{#if domainChirho.elicitation_chirho}
				<div style="color: var(--muted-chirho); font-style: italic; font-size: 11px; margin-top: 4px;">{domainChirho.elicitation_chirho}</div>
			{/if}
		</div>
	{/each}
</div>

{#if fineDomainsChirho.length > 0}
	<h2 style="margin-top: 24px;">Fine Domains</h2>
	<table style="width: 100%; border-collapse: collapse;">
		<thead>
			<tr style="border-bottom: 2px solid var(--border-chirho);">
				<th style="text-align: left; padding: 8px;">Name</th>
				<th style="text-align: left; padding: 8px;">Parent</th>
				<th style="text-align: right; padding: 8px;">Senses</th>
				<th style="text-align: left; padding: 8px;">Description</th>
			</tr>
		</thead>
		<tbody>
			{#each fineDomainsChirho as dChirho}
				<tr style="border-bottom: 1px solid var(--border-chirho);">
					<td style="padding: 8px; color: var(--accent-chirho);">{dChirho.name_chirho}</td>
					<td style="padding: 8px; color: var(--muted-chirho);">{dChirho.parent_id_chirho || '—'}</td>
					<td style="text-align: right; padding: 8px;">{dChirho.sense_count_chirho}</td>
					<td style="padding: 8px; max-width: 400px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{dChirho.description_chirho || '—'}</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
