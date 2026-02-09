<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	let { data } = $props();

	const MACRO32_COLORS_CHIRHO: Record<string, string> = {
		ANIMALS: '#98c379', ARTIFACTS: '#c678dd', AUTHORITY_RULE: '#be5046',
		BEHAVIOR: '#d19a66', BODY_HEALTH: '#e5c07b', BUILDINGS: '#abb2bf',
		COMMUNICATION: '#61afef', DANGER_DELIVERANCE: '#e06c75',
		DISCOURSE_NAMES: '#888', ECONOMICS_PROPERTY: '#c678dd',
		EMOTION_ATTITUDE: '#d19a66', EXISTENCE_STATE: '#abb2bf',
		FAITH_BELIEF: '#528bff', FOOD_DRINK: '#e5c07b', GEOGRAPHY_SPACE: '#56b6c2',
		GROUPS_COMMUNITY: '#98c379', GUIDANCE_CARE: '#61afef',
		JUSTICE_PUNISHMENT: '#be5046', MENTAL_LIFE: '#c678dd',
		MORAL_QUALITY: '#e5c07b', MOVEMENT: '#61afef', NATURAL_WORLD: '#56b6c2',
		PEOPLE_KINSHIP: '#e06c75', PHYSICAL_ACTION: '#d19a66',
		PLANTS_AGRICULTURE: '#98c379', PROPERTIES_RELATIONS: '#abb2bf',
		QUANTITY_NUMBER: '#888', RECONCILIATION: '#528bff',
		RELIGIOUS_LIFE: '#528bff', SUPERNATURAL: '#c678dd',
		TIME: '#abb2bf', VIOLENCE_CONFLICT: '#be5046'
	};

	function getColorChirho(domainsChirho: any[]): string {
		if (!domainsChirho || domainsChirho.length === 0) return 'var(--muted-chirho)';
		const macroChirho = domainsChirho.find((dChirho: any) => dChirho.hierarchy_chirho === 'macro32');
		if (macroChirho && MACRO32_COLORS_CHIRHO[macroChirho.name_chirho]) {
			return MACRO32_COLORS_CHIRHO[macroChirho.name_chirho];
		}
		return 'var(--accent-chirho)';
	}

	function getLnLabelChirho(domainsChirho: any[]): string {
		const lnChirho = domainsChirho?.find((dChirho: any) => dChirho.hierarchy_chirho === 'louw_nida');
		if (!lnChirho) return '';
		return lnChirho.name_chirho.replace(/^LN\d+_/, '').replace(/_/g, ' ');
	}

	function getMacroLabelChirho(domainsChirho: any[]): string {
		const macroChirho = domainsChirho?.find((dChirho: any) => dChirho.hierarchy_chirho === 'macro32');
		if (!macroChirho) return '';
		return macroChirho.name_chirho.replace(/_/g, ' ');
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
					{@const wordColorChirho = getColorChirho(wChirho.domainsChirho)}
					<div style="font-size: 9px; margin-top: 2px;">
						<span style="background: {wordColorChirho}22; color: {wordColorChirho}; padding: 1px 4px; border-radius: 2px;" title="{getLnLabelChirho(wChirho.domainsChirho)}">
							{getMacroLabelChirho(wChirho.domainsChirho)}
						</span>
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
				<th style="text-align: left; padding: 6px;">Macro</th>
				<th style="text-align: left; padding: 6px;">L-N</th>
				<th style="text-align: left; padding: 6px;">Glosses</th>
			</tr>
		</thead>
		<tbody>
			{#each data.wordsChirho as wChirho}
				{@const colorChirho = getColorChirho(wChirho.domainsChirho)}
				<tr style="border-bottom: 1px solid var(--border-chirho);">
					<td style="padding: 6px;">{wChirho.position_chirho}</td>
					<td style="padding: 6px;">
						<a href="/lemma-chirho/{wChirho.lemma_id_chirho}" style="color: {colorChirho};">
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
						<span style="background: {colorChirho}22; color: {colorChirho}; padding: 1px 6px; border-radius: 3px; font-size: 11px;">
							{getMacroLabelChirho(wChirho.domainsChirho) || '—'}
						</span>
					</td>
					<td style="padding: 6px; font-size: 11px; color: var(--muted-chirho);">
						{getLnLabelChirho(wChirho.domainsChirho) || '—'}
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
