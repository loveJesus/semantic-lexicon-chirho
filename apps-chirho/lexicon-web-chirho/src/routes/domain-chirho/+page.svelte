<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	let { data } = $props();

	let expandedMacroChirho = $state<string | null>(null);
	let expandedLnChirho = $state<string | null>(null);

	function lnForMacroChirho(macroChirho: string) {
		return (data.lnChirho as Record<string, any>[]).filter(
			(lChirho) => lChirho.parent_chirho === macroChirho
		);
	}

	function communityForLnChirho(lnChirho: string) {
		return (data.communityChirho as Record<string, any>[]).filter(
			(cChirho) => cChirho.parent_chirho === lnChirho
		);
	}
</script>

<style>
	.macro-card-chirho {
		background: var(--surface-chirho);
		border: 1px solid var(--border-chirho);
		border-radius: 8px;
		overflow: hidden;
	}
	.macro-btn-chirho {
		width: 100%;
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px 16px;
		background: none;
		border: none;
		color: var(--fg-chirho);
		cursor: pointer;
		font-family: inherit;
		font-size: 15px;
		text-align: left;
	}
	.macro-btn-chirho:hover {
		background: var(--border-chirho);
	}
	.ln-btn-chirho {
		width: 100%;
		display: flex;
		justify-content: space-between;
		padding: 6px 8px;
		background: none;
		border: none;
		color: var(--fg-chirho);
		cursor: pointer;
		font-family: inherit;
		font-size: 14px;
		text-align: left;
		border-radius: 4px;
	}
	.ln-btn-chirho:hover {
		background: var(--border-chirho);
	}
</style>

<h1>Semantic Domains</h1>
<p style="color: var(--muted-chirho);">Three-level hierarchy: Macro-32 &rarr; Louw-Nida &rarr; Community clusters</p>

<div style="display: grid; gap: 8px; margin-top: 24px;">
	{#each data.macro32Chirho as mChirho}
		{@const childrenLnChirho = lnForMacroChirho(mChirho.name_chirho)}
		<div class="macro-card-chirho">
			<button
				onclick={() => expandedMacroChirho = expandedMacroChirho === mChirho.name_chirho ? null : mChirho.name_chirho}
				class="macro-btn-chirho"
			>
				<span>
					<a href="/domain-chirho/{encodeURIComponent(mChirho.name_chirho)}" style="color: var(--green-chirho); font-weight: bold;" onclick={(e) => e.stopPropagation()}>{mChirho.name_chirho}</a>
					<span style="color: var(--muted-chirho); margin-left: 8px; font-size: 13px;">{childrenLnChirho.length} L-N domains</span>
				</span>
				<span style="color: var(--muted-chirho); font-size: 13px;">{mChirho.sense_count_chirho} senses {expandedMacroChirho === mChirho.name_chirho ? '&#9662;' : '&#9656;'}</span>
			</button>

			{#if expandedMacroChirho === mChirho.name_chirho}
				<div style="border-top: 1px solid var(--border-chirho); padding: 8px 16px;">
					{#each childrenLnChirho as lnChirho}
						{@const childrenCommChirho = communityForLnChirho(lnChirho.name_chirho)}
						<div style="margin-bottom: 4px;">
							<button
								onclick={() => expandedLnChirho = expandedLnChirho === lnChirho.name_chirho ? null : lnChirho.name_chirho}
								class="ln-btn-chirho"
							>
								<a href="/domain-chirho/{encodeURIComponent(lnChirho.name_chirho)}" style="color: var(--blue-chirho);" onclick={(e) => e.stopPropagation()}>{lnChirho.name_chirho}</a>
								<span style="color: var(--muted-chirho); font-size: 13px;">
									{lnChirho.sense_count_chirho} senses
									{#if childrenCommChirho.length > 0}
										&middot; {childrenCommChirho.length} clusters
									{/if}
									{expandedLnChirho === lnChirho.name_chirho ? '&#9662;' : '&#9656;'}
								</span>
							</button>

							{#if expandedLnChirho === lnChirho.name_chirho && childrenCommChirho.length > 0}
								<div style="padding: 4px 0 4px 24px;">
									{#each childrenCommChirho as cChirho}
										<div style="display: flex; justify-content: space-between; padding: 3px 8px; font-size: 13px;">
											<a href="/domain-chirho/{encodeURIComponent(cChirho.name_chirho)}" style="color: var(--purple-chirho);">{cChirho.name_chirho}</a>
											<span style="color: var(--muted-chirho); font-size: 12px;">{cChirho.sense_count_chirho}</span>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/each}
</div>
