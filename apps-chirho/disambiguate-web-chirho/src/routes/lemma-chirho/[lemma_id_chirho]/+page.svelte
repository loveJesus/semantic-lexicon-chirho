<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	let { data } = $props();
</script>

<a href="/lemma-chirho" style="color: var(--muted-chirho);">Back to Lemmas</a>

<h1 style="margin-top: 8px;">Lemma: {data.lemmaIdChirho}</h1>

{#if data.lemmaChirho}
	<div style="color: var(--muted-chirho); margin-bottom: 24px;">
		<span>POS: {(data.lemmaChirho as any).pos_chirho || '—'}</span>
		<span style="margin-left: 16px;">Gloss: {(data.lemmaChirho as any).gloss_chirho || '—'}</span>
	</div>
{/if}

<h2>{data.senseDetailsChirho.length} Senses</h2>

{#each data.senseDetailsChirho as senseChirho, idxChirho}
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
		<div style="display: flex; justify-content: space-between; align-items: center;">
			<h3 style="margin: 0; color: var(--accent-chirho);">
				Sense {idxChirho + 1}: {senseChirho.label_chirho || `Cluster ${senseChirho.sense_id_chirho}`}
			</h3>
			<span style="color: var(--muted-chirho);">{senseChirho.occ_count_chirho} occurrences</span>
		</div>

		{#if senseChirho.description_chirho}
			<p style="color: var(--muted-chirho); margin: 4px 0;">{senseChirho.description_chirho}</p>
		{/if}

		{#if senseChirho.domainAssignmentsChirho?.length > 0}
			<div style="margin-top: 8px;">
				{#each senseChirho.domainAssignmentsChirho as daChirho}
					<span style="background: #1a3a5c; padding: 2px 8px; border-radius: 4px; margin-right: 4px; font-size: 12px;">
						{daChirho.name_chirho} ({daChirho.fit_score_chirho})
					</span>
				{/each}
			</div>
		{/if}

		<details style="margin-top: 12px;">
			<summary style="cursor: pointer; color: var(--accent-chirho);">
				Show occurrences ({senseChirho.occurrencesChirho.length} shown)
			</summary>
			<table style="width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px;">
				<thead>
					<tr style="border-bottom: 1px solid var(--border-chirho);">
						<th style="text-align: left; padding: 4px;">ID</th>
						<th style="text-align: left; padding: 4px;">Surface</th>
						<th style="text-align: left; padding: 4px;">Ref</th>
						<th style="text-align: left; padding: 4px;">Glosses</th>
					</tr>
				</thead>
				<tbody>
					{#each senseChirho.occurrencesChirho as occChirho}
						<tr style="border-bottom: 1px solid var(--border-chirho);">
							<td style="padding: 4px; font-family: monospace;">{occChirho.occurrence_id_chirho}</td>
							<td style="padding: 4px;">{occChirho.surface_chirho}</td>
							<td style="padding: 4px; color: var(--muted-chirho);">{occChirho.book_chirho}:{occChirho.chapter_chirho}:{occChirho.verse_chirho}</td>
							<td style="padding: 4px;">
								{#each occChirho.glossesChirho as gChirho}
									<span style="margin-right: 8px;">
										<strong style="color: var(--muted-chirho);">{gChirho.language_code_chirho}:</strong> {gChirho.gloss_text_chirho}
									</span>
								{/each}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</details>
	</div>
{/each}
