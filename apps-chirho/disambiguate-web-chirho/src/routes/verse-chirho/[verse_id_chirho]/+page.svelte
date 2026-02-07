<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	let { data } = $props();

	const DOMAIN_COLORS_CHIRHO: Record<string, string> = {
		PERSON: '#e06c75', BODY: '#d19a66', LOCATION: '#61afef',
		ARTIFACT: '#c678dd', FOOD_DRINK: '#e5c07b', ANIMAL: '#98c379',
		PLANT: '#56b6c2', NATURAL_WORLD: '#528bff', TIME: '#abb2bf',
		EVENT: '#be5046', ACTION: '#e06c75', SPEECH: '#61afef',
		COGNITION: '#c678dd', EMOTION: '#d19a66', MORAL: '#e5c07b',
		SOCIAL: '#98c379', AUTHORITY: '#be5046', WORSHIP: '#528bff',
		SUPERNATURAL: '#c678dd', QUANTITY: '#abb2bf'
	};

	function getColorChirho(domainsChirho: any[]): string {
		if (!domainsChirho || domainsChirho.length === 0) return 'var(--muted-chirho)';
		const superChirho = domainsChirho.find((dChirho: any) => dChirho.level_chirho === 0);
		if (superChirho && DOMAIN_COLORS_CHIRHO[superChirho.name_chirho]) {
			return DOMAIN_COLORS_CHIRHO[superChirho.name_chirho];
		}
		return 'var(--accent-chirho)';
	}
</script>

<a href="/" style="color: var(--muted-chirho);">Home</a>

<h1 style="margin-top: 8px;">Verse: {data.refChirho}</h1>
<p style="color: var(--muted-chirho);">Verse ID: {data.verseIdChirho}</p>

{#if data.wordsChirho.length === 0}
	<p>No words found for this verse.</p>
{:else}
	<div style="display: flex; flex-wrap: wrap; gap: 16px; margin-top: 24px; align-items: flex-start;">
		{#each data.wordsChirho as wChirho}
			<div style="text-align: center; min-width: 80px; max-width: 160px;">
				<a href="/lemma-chirho/{wChirho.lemma_id_chirho}" style="font-size: 20px; color: {getColorChirho(wChirho.domainsChirho)}; text-decoration: none; display: block;">
					{wChirho.surface_chirho}
				</a>
				<div style="font-size: 11px; color: var(--muted-chirho); margin-top: 2px;">
					{wChirho.gloss_chirho || '—'}
				</div>
				{#if wChirho.sense_label_chirho}
					<div style="font-size: 10px; color: var(--accent-chirho); margin-top: 2px;">
						{wChirho.sense_label_chirho}
					</div>
				{/if}
				{#if wChirho.domainsChirho.length > 0}
					<div style="font-size: 9px; margin-top: 2px;">
						{#each wChirho.domainsChirho.filter((dChirho: any) => dChirho.level_chirho === 0) as dChirho}
							<span style="background: {getColorChirho([dChirho])}22; color: {getColorChirho([dChirho])}; padding: 1px 4px; border-radius: 2px;">
								{dChirho.name_chirho}
							</span>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</div>

	<h2 style="margin-top: 32px;">Word Details</h2>
	<table style="width: 100%; border-collapse: collapse; font-size: 13px;">
		<thead>
			<tr style="border-bottom: 1px solid var(--border-chirho);">
				<th style="text-align: left; padding: 6px;">Pos</th>
				<th style="text-align: left; padding: 6px;">Surface</th>
				<th style="text-align: left; padding: 6px;">Lemma</th>
				<th style="text-align: left; padding: 6px;">POS</th>
				<th style="text-align: left; padding: 6px;">Sense</th>
				<th style="text-align: left; padding: 6px;">Domain</th>
				<th style="text-align: left; padding: 6px;">Glosses</th>
			</tr>
		</thead>
		<tbody>
			{#each data.wordsChirho as wChirho}
				<tr style="border-bottom: 1px solid var(--border-chirho);">
					<td style="padding: 6px;">{wChirho.position_chirho}</td>
					<td style="padding: 6px;">
						<a href="/lemma-chirho/{wChirho.lemma_id_chirho}" style="color: {getColorChirho(wChirho.domainsChirho)};">
							{wChirho.surface_chirho}
						</a>
					</td>
					<td style="padding: 6px; color: var(--muted-chirho);">
						<a href="/lemma-chirho/{wChirho.lemma_id_chirho}">{wChirho.lemma_id_chirho}</a>
					</td>
					<td style="padding: 6px; color: var(--muted-chirho);">{wChirho.pos_chirho || '—'}</td>
					<td style="padding: 6px; color: var(--accent-chirho);">
						{wChirho.sense_label_chirho || (wChirho.sense_id_chirho ? `#${wChirho.sense_id_chirho}` : '—')}
					</td>
					<td style="padding: 6px;">
						{#each wChirho.domainsChirho.filter((dChirho: any) => dChirho.level_chirho === 0) as dChirho}
							<span style="background: {getColorChirho([dChirho])}22; color: {getColorChirho([dChirho])}; padding: 1px 6px; border-radius: 3px; font-size: 11px; margin-right: 2px;">
								{dChirho.name_chirho}
							</span>
						{/each}
					</td>
					<td style="padding: 6px; font-size: 11px;">
						{#each wChirho.glossesChirho as gChirho}
							<span style="margin-right: 6px;">
								<strong style="color: var(--muted-chirho);">{gChirho.language_code_chirho}:</strong> {gChirho.gloss_text_chirho}
							</span>
						{/each}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
{/if}
