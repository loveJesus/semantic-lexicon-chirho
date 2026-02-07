<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	let { data } = $props();
</script>

<h1>Review Queue</h1>
<p style="color: var(--muted-chirho);">{data.totalChirho} items pending review (page {data.pageChirho}/{data.totalPagesChirho})</p>

<table style="width: 100%; border-collapse: collapse;">
	<thead>
		<tr style="border-bottom: 2px solid var(--border-chirho);">
			<th style="text-align: left; padding: 8px;">Lemma</th>
			<th style="text-align: left; padding: 8px;">Gloss</th>
			<th style="text-align: right; padding: 8px;">Score</th>
			<th style="text-align: right; padding: 8px;">Senses</th>
			<th style="text-align: left; padding: 8px;">Reason</th>
		</tr>
	</thead>
	<tbody>
		{#each data.queueChirho as itemChirho}
			<tr style="border-bottom: 1px solid var(--border-chirho);">
				<td style="padding: 8px;">
					<a href="/lemma-chirho/{itemChirho.lemma_id_chirho}">{itemChirho.lemma_id_chirho}</a>
				</td>
				<td style="padding: 8px; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
					{itemChirho.gloss_chirho || '—'}
				</td>
				<td style="text-align: right; padding: 8px; color: var(--accent-chirho);">
					{itemChirho.uncertainty_score_chirho.toFixed(3)}
				</td>
				<td style="text-align: right; padding: 8px;">{itemChirho.sense_count_chirho}</td>
				<td style="padding: 8px; color: var(--muted-chirho); font-size: 12px;">{itemChirho.reason_chirho}</td>
			</tr>
		{/each}
	</tbody>
</table>

<div style="margin-top: 16px; display: flex; gap: 8px;">
	{#if data.pageChirho > 1}
		<a href="/review-chirho/queue-chirho?page={data.pageChirho - 1}" style="padding: 6px 12px; background: var(--surface-chirho); border: 1px solid var(--border-chirho); border-radius: 4px;">Prev</a>
	{/if}
	{#if data.pageChirho < data.totalPagesChirho}
		<a href="/review-chirho/queue-chirho?page={data.pageChirho + 1}" style="padding: 6px 12px; background: var(--surface-chirho); border: 1px solid var(--border-chirho); border-radius: 4px;">Next</a>
	{/if}
</div>
