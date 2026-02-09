<!-- For God so loved the world that he gave his only begotten Son,
     that whoever believes in him should not perish but have eternal life. -->
<script lang="ts">
	let { data } = $props();
</script>

<h1>semantic-chirho</h1>
<p style="color: var(--muted-chirho);">Semantic domain mapping pipeline for Bible translations</p>

<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 24px;">
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 20px; border-radius: 8px;">
		<div style="font-size: 28px; color: var(--accent-chirho);">{data.statsChirho.wordsChirho.toLocaleString()}</div>
		<div style="color: var(--muted-chirho);">Words</div>
	</div>
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 20px; border-radius: 8px;">
		<div style="font-size: 28px; color: var(--accent-chirho);">{data.statsChirho.lemmasChirho.toLocaleString()}</div>
		<div style="color: var(--muted-chirho);">Lemmas</div>
	</div>
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 20px; border-radius: 8px;">
		<div style="font-size: 28px; color: var(--accent-chirho);">{data.statsChirho.sensesChirho.toLocaleString()}</div>
		<div style="color: var(--muted-chirho);">Senses</div>
	</div>
</div>

<h2 style="margin-top: 24px;">Domain Hierarchy</h2>
<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px;">
	<div style="background: #1a3a2a; border: 1px solid #2a4a3a; padding: 20px; border-radius: 8px;">
		<div style="font-size: 28px; color: #98c379;">{data.statsChirho.macro32Chirho}</div>
		<div style="color: #98c379;">Macro Domains</div>
	</div>
	<div style="background: #1a2a3a; border: 1px solid #2a3a4a; padding: 20px; border-radius: 8px;">
		<div style="font-size: 28px; color: #61afef;">{data.statsChirho.louwNidaChirho}</div>
		<div style="color: #61afef;">Louw-Nida Groups</div>
	</div>
	<div style="background: #2a1a3a; border: 1px solid #3a2a4a; padding: 20px; border-radius: 8px;">
		<div style="font-size: 28px; color: #c678dd;">{data.statsChirho.communitiesChirho.toLocaleString()}</div>
		<div style="color: #c678dd;">Communities</div>
	</div>
</div>

<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 16px;">
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 20px; border-radius: 8px;">
		<div style="font-size: 28px; color: var(--accent-chirho);">{data.statsChirho.assignmentsChirho.toLocaleString()}</div>
		<div style="color: var(--muted-chirho);">Sense Assignments</div>
	</div>
	<div style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 20px; border-radius: 8px;">
		<div style="font-size: 28px; color: var(--accent-chirho);">{data.statsChirho.reviewQueueChirho}</div>
		<div style="color: var(--muted-chirho);">Pending Review</div>
	</div>
</div>

<div style="margin-top: 32px; display: flex; gap: 16px;">
	<a href="/lemma-chirho" style="background: var(--accent-chirho); color: #000; padding: 10px 20px; border-radius: 6px; font-weight: bold;">Browse Lemmas</a>
	<a href="/domain-chirho" style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 10px 20px; border-radius: 6px;">Browse Domains</a>
	<a href="/review-chirho/queue-chirho" style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 10px 20px; border-radius: 6px;">Review Queue</a>
	<a href="/scorecard-chirho" style="background: var(--surface-chirho); border: 1px solid var(--border-chirho); padding: 10px 20px; border-radius: 6px;">Scorecard</a>
</div>
